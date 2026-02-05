import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { billingEventId, amount, reason } = await request.json();

    if (!billingEventId) {
      return NextResponse.json({ error: "Billing event ID required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get the billing event
    const { data: event, error: eventError } = await adminClient
      .from("billing_events")
      .select("*, organization:organization_id(id, name)")
      .eq("id", billingEventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Billing event not found" }, { status: 404 });
    }

    if (event.event_type !== "payment_success") {
      return NextResponse.json({ error: "Can only refund payment events" }, { status: 400 });
    }

    if (!event.stripe_payment_intent_id && !event.stripe_invoice_id) {
      return NextResponse.json({ error: "No Stripe payment info found for this event" }, { status: 400 });
    }

    const stripe = getStripe();

    // If we have a payment intent, refund directly
    // If we only have invoice, get the payment intent from it
    let paymentIntentId = event.stripe_payment_intent_id;

    if (!paymentIntentId && event.stripe_invoice_id) {
      const invoice = await stripe.invoices.retrieve(event.stripe_invoice_id);
      if (invoice.payment_intent) {
        paymentIntentId = typeof invoice.payment_intent === 'string' 
          ? invoice.payment_intent 
          : invoice.payment_intent.id;
      }
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Could not find payment intent for refund" }, { status: 400 });
    }

    // Create the refund
    const refundParams: {
      payment_intent: string;
      amount?: number;
      reason?: "duplicate" | "fraudulent" | "requested_by_customer";
      metadata: Record<string, string>;
    } = {
      payment_intent: paymentIntentId,
      metadata: {
        billing_event_id: billingEventId,
        refunded_by: user.id,
        organization_id: event.organization_id,
      },
    };

    // If partial refund amount specified (in dollars), convert to cents
    if (amount && amount > 0) {
      refundParams.amount = Math.round(amount * 100);
    }

    if (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer") {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    // Log the refund as a billing event
    await adminClient.from("billing_events").insert({
      organization_id: event.organization_id,
      user_id: user.id,
      event_type: "refund",
      previous_plan: event.new_plan,
      new_plan: event.new_plan,
      amount_cents: refund.amount ? -refund.amount : -(event.amount_cents || 0),
      source: "stripe",
      stripe_invoice_id: event.stripe_invoice_id,
      stripe_payment_intent_id: paymentIntentId,
      metadata: {
        refund_id: refund.id,
        original_event_id: billingEventId,
        reason: reason || "requested_by_customer",
      },
      notes: `Refund processed by admin. ${reason ? `Reason: ${reason}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}
