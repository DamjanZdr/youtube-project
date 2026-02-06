import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Plan hierarchy (higher index = better plan)
const PLAN_HIERARCHY = ["free", "creator", "studio", "enterprise"];

// Helper: get plan level (for comparison)
function getPlanLevel(plan: string): number {
  const index = PLAN_HIERARCHY.indexOf(plan);
  return index >= 0 ? index : 0;
}

// Helper: get plan duration in months
function getDurationMonths(duration: string): number {
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

  const body = await req.json();
  const key = body.key;
  let organization_id = body.organization_id || body.organizationId;
  const studioSlug = body.studioSlug;
  
  // If studioSlug provided, look up the org ID
  if (studioSlug && !organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();
    
    if (org) {
      organization_id = org.id;
    }
  }
  
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

  // Compare plan levels
  const currentPlanLevel = getPlanLevel(sub.plan);
  const keyPlanLevel = getPlanLevel(planKey.plan);
  const isSamePlan = sub.plan === planKey.plan;
  const isUpgrade = keyPlanLevel > currentPlanLevel;
  const isDowngrade = keyPlanLevel < currentPlanLevel;

  // Prevent downgrading with a key
  if (isDowngrade) {
    const currentPlanName = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
    const keyPlanName = planKey.plan.charAt(0).toUpperCase() + planKey.plan.slice(1);
    return NextResponse.json({ 
      error: `Cannot redeem this key. You're already on ${currentPlanName}, which is higher than ${keyPlanName}. This key cannot be used to downgrade your plan.`,
      code: "DOWNGRADE_NOT_ALLOWED"
    }, { status: 400 });
  }

  // Calculate expiration based on duration
  const now = new Date();
  let expiresAt: Date | null = null;
  
  if (planKey.duration === "lifetime") {
    // Lifetime keys never expire
    expiresAt = null;
  } else if (isSamePlan && sub.source === "key" && sub.current_period_end) {
    // Same plan + already on a key: EXTEND the existing time
    // Start from current expiration date instead of now
    const currentExpiration = new Date(sub.current_period_end);
    expiresAt = new Date(currentExpiration);
    expiresAt.setMonth(expiresAt.getMonth() + getDurationMonths(planKey.duration));
  } else {
    // Upgrade or first key on this plan: start fresh from now
    expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + getDurationMonths(planKey.duration));
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

  // Build the subscription update
  // Only backup previous plan if this is an upgrade AND they were on a Stripe plan
  const subscriptionUpdate: Record<string, any> = {
    plan: planKey.plan,
    source: "key",
    key_id: planKey.id, // Track which key is active
    status: "active", // Ensure subscription is marked active
    current_period_start: isSamePlan && sub.source === "key" ? sub.current_period_start : now.toISOString(),
    current_period_end: expiresAt ? expiresAt.toISOString() : null,
  };

  // If they're on a paid Stripe plan, store the previous info so we can resume when key expires
  // This applies to both upgrades AND same-plan keys
  if (sub.source === "stripe" && sub.plan !== "free" && sub.stripe_subscription_id) {
    subscriptionUpdate.previous_plan = sub.plan;
    subscriptionUpdate.previous_stripe_subscription_id = sub.stripe_subscription_id;
    // Note: We should ideally pause the Stripe subscription here
    // For now, the admin should manually pause/cancel via Stripe dashboard
  }

  const { error: subUpdateError } = await supabase
    .from("subscriptions")
    .update(subscriptionUpdate)
    .eq("id", sub.id);
    
  if (subUpdateError) {
    console.error("Failed to update subscription:", subUpdateError);
    return NextResponse.json({ error: "Failed to update subscription", details: subUpdateError.message }, { status: 500 });
  }
  
  // Verify the update worked by fetching it
  const { data: updatedSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", sub.id)
    .single();
    
  console.log(`Key redeemed: org=${organization_id}, plan=${planKey.plan}, expires=${expiresAt?.toISOString()}`);
  console.log(`Updated subscription:`, updatedSub);

  // Log billing event
  const eventType = isSamePlan && sub.source === "key" 
    ? "key_extended" 
    : isUpgrade 
      ? "key_upgrade" 
      : "key_redeemed";
  
  // Log billing event (non-blocking)
  supabase.from("billing_events").insert({
    organization_id: organization_id,
    user_id: user.id,
    event_type: eventType,
    previous_plan: sub.plan,
    new_plan: planKey.plan,
    amount_cents: 0, // Key = free
    source: "key",
    key_id: planKey.id,
    period_start: now.toISOString(),
    period_end: expiresAt?.toISOString() || null,
    metadata: {
      key_duration: planKey.duration,
      extended: isSamePlan && sub.source === "key",
    }
  }).then(({ error }) => {
    if (error) console.error("Failed to log billing event:", error);
  });

  // Build response message
  let message = "";
  if (isSamePlan && sub.source === "key") {
    message = `Extended your ${planKey.plan} plan`;
  } else if (isUpgrade) {
    message = `Upgraded to ${planKey.plan}`;
  } else {
    message = `Activated ${planKey.plan} plan`;
  }

  return NextResponse.json({ 
    success: true, 
    plan: planKey.plan, 
    expires_at: expiresAt,
    message,
    extended: isSamePlan && sub.source === "key",
    upgraded: isUpgrade,
    previous_plan: isUpgrade ? sub.plan : null,
  });
}
