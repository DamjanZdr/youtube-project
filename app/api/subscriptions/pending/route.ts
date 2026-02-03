import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Plan hierarchy (higher index = better plan)
const PLAN_HIERARCHY = ["free", "creator", "studio", "enterprise"];

// Helper: get plan level (for comparison)
function getPlanLevel(plan: string): number {
  const index = PLAN_HIERARCHY.indexOf(plan);
  return index >= 0 ? index : 0;
}

/**
 * POST: Set pending_plan for a gifted subscription
 * When user wants to schedule a plan to start after their gift expires
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { organization_id, plan, interval } = body;

  if (!organization_id || !plan || !interval) {
    return NextResponse.json({ 
      error: "Missing required fields: organization_id, plan, interval" 
    }, { status: 400 });
  }

  // Validate plan
  if (!PLAN_HIERARCHY.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Validate interval
  if (!["month", "year"].includes(interval)) {
    return NextResponse.json({ error: "Invalid interval (must be 'month' or 'year')" }, { status: 400 });
  }

  // Check user owns the organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .eq("id", organization_id)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the owner can manage subscriptions" }, { status: 403 });
  }

  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organization_id)
    .single();

  if (subError || !subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Verify this is a gifted (key) subscription
  if (subscription.source !== "key") {
    return NextResponse.json({ 
      error: "Pending plan scheduling is only available for gifted subscriptions" 
    }, { status: 400 });
  }

  // For gifted plans, users should only schedule same or lower tier plans
  // Higher tier upgrades should be done immediately (handled by the upgrade flow)
  const currentPlanLevel = getPlanLevel(subscription.plan);
  const pendingPlanLevel = getPlanLevel(plan);

  if (pendingPlanLevel > currentPlanLevel) {
    return NextResponse.json({ 
      error: "For higher tier plans, please use the upgrade option which applies immediately" 
    }, { status: 400 });
  }

  // Update subscription with pending plan
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      pending_plan: plan,
      pending_interval: interval,
    })
    .eq("id", subscription.id);

  if (updateError) {
    console.error("Failed to set pending plan:", updateError);
    return NextResponse.json({ error: "Failed to schedule plan" }, { status: 500 });
  }

  // Log billing event
  supabase.from("billing_events").insert({
    organization_id: organization_id,
    user_id: user.id,
    event_type: "pending_plan_scheduled",
    previous_plan: subscription.plan,
    new_plan: plan,
    source: "key",
    metadata: {
      pending_interval: interval,
      gift_expires: subscription.current_period_end,
    }
  }).then(({ error }) => {
    if (error) console.error("Failed to log billing event:", error);
  });

  return NextResponse.json({ 
    success: true,
    message: `${plan} plan scheduled to start after your gift expires`,
    pending_plan: plan,
    pending_interval: interval,
  });
}

/**
 * DELETE: Clear pending_plan for a gifted subscription
 * Cancel the scheduled plan
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { organization_id } = body;

  if (!organization_id) {
    return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });
  }

  // Check user owns the organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .eq("id", organization_id)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the owner can manage subscriptions" }, { status: 403 });
  }

  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organization_id)
    .single();

  if (subError || !subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Verify this is a gifted (key) subscription
  if (subscription.source !== "key") {
    return NextResponse.json({ 
      error: "This action is only available for gifted subscriptions" 
    }, { status: 400 });
  }

  // Check if there's actually a pending plan to cancel
  if (!subscription.pending_plan) {
    return NextResponse.json({ error: "No scheduled plan to cancel" }, { status: 400 });
  }

  const cancelledPlan = subscription.pending_plan;
  const cancelledInterval = subscription.pending_interval;

  // Clear pending plan
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      pending_plan: null,
      pending_interval: null,
    })
    .eq("id", subscription.id);

  if (updateError) {
    console.error("Failed to clear pending plan:", updateError);
    return NextResponse.json({ error: "Failed to cancel scheduled plan" }, { status: 500 });
  }

  // Log billing event
  supabase.from("billing_events").insert({
    organization_id: organization_id,
    user_id: user.id,
    event_type: "pending_plan_cancelled",
    previous_plan: cancelledPlan,
    new_plan: null,
    source: "key",
    metadata: {
      cancelled_interval: cancelledInterval,
    }
  }).then(({ error }) => {
    if (error) console.error("Failed to log billing event:", error);
  });

  return NextResponse.json({ 
    success: true,
    message: "Scheduled plan cancelled",
  });
}
