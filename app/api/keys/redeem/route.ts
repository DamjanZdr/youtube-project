import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper: get plan duration in months
function getDurationMonths(duration: string) {
  if (duration === "month") return 1;
  if (duration === "year") return 12;
  if (duration === "lifetime") return 1200; // Arbitrary large number for lifetime
  return 0;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Get user from Supabase session (adjust if you use a different auth flow)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, organization_id } = await req.json();
  if (!key || !organization_id) {
    return NextResponse.json({ error: "Missing key or organization_id" }, { status: 400 });
  }

  // Fetch the key
  const { data: planKey, error: keyError } = await supabase
    .from("plan_keys")
    .select("*")
    .eq("key", key)
    .single();
  if (keyError || !planKey) {
    return NextResponse.json({ error: "Invalid or expired key" }, { status: 404 });
  }
  if (planKey.redeemed_at) {
    return NextResponse.json({ error: "Key already redeemed" }, { status: 409 });
  }
  if (planKey.assigned_org_id && planKey.assigned_org_id !== organization_id) {
    return NextResponse.json({ error: "Key is not valid for this organization" }, { status: 403 });
  }

  // Check user is owner/admin of org
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .eq("id", organization_id)
    .single();
  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (org.owner_id !== user.id) {
    // Optionally: check for admin role if you support it
    return NextResponse.json({ error: "Only the owner can redeem keys" }, { status: 403 });
  }

  // Fetch current subscription
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organization_id)
    .single();
  if (subError || !sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Calculate expiration
  const now = new Date();
  let expiresAt: Date | null = null;
  if (planKey.plan_type === "lifetime") {
    expiresAt = null;
  } else {
    expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + getDurationMonths(planKey.plan_type));
  }

  // Update plan_keys as redeemed
  const { error: redeemError } = await supabase
    .from("plan_keys")
    .update({
      redeemed_org_id: organization_id,
      redeemed_by: user.id,
      redeemed_at: now.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .eq("id", planKey.id);
  if (redeemError) {
    return NextResponse.json({ error: "Failed to redeem key" }, { status: 500 });
  }

  // Update subscription: backup previous plan, set new plan, set source to 'key'
  const { error: subUpdateError } = await supabase
    .from("subscriptions")
    .update({
      previous_plan: sub.plan,
      previous_stripe_subscription_id: sub.stripe_subscription_id,
      plan: planKey.plan_type,
      source: "key",
      current_period_start: now.toISOString(),
      current_period_end: expiresAt ? expiresAt.toISOString() : null,
    })
    .eq("id", sub.id);
  if (subUpdateError) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  // TODO: Pause/cancel Stripe billing if needed (not implemented here)

  return NextResponse.json({ success: true, plan: planKey.plan_type, expires_at: expiresAt });
}
