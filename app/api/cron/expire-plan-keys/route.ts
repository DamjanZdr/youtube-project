// pages/api/cron/expire-plan-keys.ts (or app/api/cron/expire-plan-keys/route.ts for App Router)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vercel Cron config: runs every hour
export const config = {
  schedule: "0 * * * *", // every hour
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const now = new Date();

  // Find all expired, unprocessed plan keys
  const { data: expiredKeys, error } = await supabase
    .from("plan_keys")
    .select("*")
    .lt("expires_at", now.toISOString())
    .is("processed_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  for (const key of expiredKeys || []) {
    // Get the org's subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", key.redeemed_org_id)
      .single();
    if (!sub) continue;

    // Revert to previous plan or free
    const newPlan = sub.previous_plan || "free";
    const updates: any = {
      plan: newPlan,
      source: "stripe",
      previous_plan: null,
      previous_stripe_subscription_id: null,
      current_period_end: now.toISOString(),
    };
    await supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", sub.id);

    // Mark key as processed
    await supabase
      .from("plan_keys")
      .update({ processed_at: now.toISOString() })
      .eq("id", key.id);

    processed++;
    // TODO: Resume Stripe billing if previous_stripe_subscription_id exists
  }

  return NextResponse.json({ processed });
}
