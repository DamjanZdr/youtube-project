// Admin endpoint to manually trigger plan expiration
// This allows admins to expire plans without waiting for the cron job
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify admin access
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient();
  const now = new Date();
  let processed = 0;
  const results: any[] = [];

  // Find expired subscriptions with source='key'
  const { data: expiredGifts, error } = await adminClient
    .from("subscriptions")
    .select("*, organizations(id, name, slug, owner_id)")
    .eq("source", "key")
    .eq("status", "active")
    .lt("current_period_end", now.toISOString())
    .not("current_period_end", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const sub of expiredGifts || []) {
    try {
      const org = sub.organizations as any;
      
      // Downgrade to free
      const { error: updateError } = await adminClient
        .from("subscriptions")
        .update({
          plan: "free",
          source: null,
          key_id: null,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: null,
        })
        .eq("id", sub.id);

      if (updateError) {
        results.push({
          org_id: sub.organization_id,
          org_name: org?.name,
          error: updateError.message,
        });
        continue;
      }

      // Log billing event
      await adminClient.from("billing_events").insert({
        organization_id: sub.organization_id,
        event_type: "gift_expired",
        previous_plan: sub.plan,
        new_plan: "free",
        source: "key",
        metadata: { expired_by_admin: true, admin_id: user.id }
      });

      processed++;
      results.push({
        org_id: sub.organization_id,
        org_name: org?.name,
        previous_plan: sub.plan,
        new_plan: "free",
        expired_at: sub.current_period_end,
      });
    } catch (err) {
      results.push({
        org_id: sub.organization_id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Also check plan_keys table for unprocessed expired keys
  const { data: expiredKeys } = await adminClient
    .from("plan_keys")
    .select("id, redeemed_org_id, expires_at")
    .lt("expires_at", now.toISOString())
    .is("processed_at", null);

  // Mark them as processed
  for (const key of expiredKeys || []) {
    await adminClient
      .from("plan_keys")
      .update({ processed_at: now.toISOString() })
      .eq("id", key.id);
  }

  return NextResponse.json({
    success: true,
    processed,
    total_found: expiredGifts?.length || 0,
    keys_processed: expiredKeys?.length || 0,
    results,
  });
}
