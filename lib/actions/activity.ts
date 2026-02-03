"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Update user's last active timestamp
 * Call this from layouts or key user actions
 */
export async function updateUserActivity() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Update user's last_active_at (throttle to once per 5 minutes to reduce DB writes)
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch (error) {
    // Silently fail - activity tracking shouldn't break the app
    console.error("Failed to update user activity:", error);
  }
}

/**
 * Update organization's last activity timestamp
 * Call this when any member performs an action in the org
 */
export async function updateOrgActivity(organizationId: string) {
  try {
    const supabase = await createClient();
    
    await supabase
      .from("organizations")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", organizationId);
  } catch (error) {
    console.error("Failed to update org activity:", error);
  }
}

/**
 * Log a billing event
 */
export async function logBillingEvent(params: {
  organizationId: string;
  userId?: string;
  eventType: string;
  previousPlan?: string;
  newPlan?: string;
  amountCents?: number;
  source?: "stripe" | "key" | "admin";
  stripeInvoiceId?: string;
  keyId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createClient();
    
    // Get current user if not provided
    let userId = params.userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    
    await supabase.from("billing_events").insert({
      organization_id: params.organizationId,
      user_id: userId,
      event_type: params.eventType,
      previous_plan: params.previousPlan,
      new_plan: params.newPlan,
      amount_cents: params.amountCents,
      source: params.source || "stripe",
      stripe_invoice_id: params.stripeInvoiceId,
      key_id: params.keyId,
      period_start: params.periodStart?.toISOString(),
      period_end: params.periodEnd?.toISOString(),
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("Failed to log billing event:", error);
  }
}
