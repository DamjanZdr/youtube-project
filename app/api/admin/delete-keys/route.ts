import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  // Verify admin
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

  const { keyIds } = await req.json();

  if (!keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
    return NextResponse.json({ error: "No keys provided" }, { status: 400 });
  }

  // Get the keys to be deactivated
  const { data: keysToDeactivate, error: fetchError } = await adminClient
    .from("plan_keys")
    .select("id, plan, redeemed_org_id, redeemed_at, deactivated_at")
    .in("id", keyIds)
    .is("deactivated_at", null); // Only get non-deactivated keys

  if (fetchError) {
    console.error("Failed to fetch keys:", fetchError);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }

  if (!keysToDeactivate || keysToDeactivate.length === 0) {
    return NextResponse.json({ error: "No active keys to deactivate" }, { status: 400 });
  }

  // Find active keys (redeemed and currently powering an org's subscription)
  const redeemedOrgIds = keysToDeactivate
    .filter(k => k.redeemed_org_id && k.redeemed_at)
    .map(k => k.redeemed_org_id!) || [];

  let revokedCount = 0;

  if (redeemedOrgIds.length > 0) {
    // Get subscriptions for these orgs that are key-based
    // Match by key_id for accuracy
    const keyIdsBeingDeactivated = keysToDeactivate.map(k => k.id);
    
    const { data: subscriptions } = await adminClient
      .from("subscriptions")
      .select("id, organization_id, plan, source, key_id")
      .in("organization_id", redeemedOrgIds)
      .eq("source", "key");

    if (subscriptions && subscriptions.length > 0) {
      // For each subscription that matches a key being deactivated, downgrade to free
      for (const sub of subscriptions) {
        // Match by key_id (more accurate) or by org + plan (fallback)
        const matchingKey = keysToDeactivate.find(
          k => k.id === sub.key_id || 
               (k.redeemed_org_id === sub.organization_id && k.plan === sub.plan)
        );

        if (matchingKey) {
          // Revoke: downgrade to free
          const { error: updateError } = await adminClient
            .from("subscriptions")
            .update({
              plan: "free",
              source: null, // Clear source - no longer key-based
              key_id: null, // Clear key reference
              current_period_end: null, // Clear expiration
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) {
            revokedCount++;
          } else {
            console.error("Failed to revoke subscription:", updateError);
          }
        }
      }
    }
  }

  // Deactivate the keys (soft delete)
  const { error: deactivateError } = await adminClient
    .from("plan_keys")
    .update({
      deactivated_at: new Date().toISOString(),
      deactivated_by: user.id,
    })
    .in("id", keyIds)
    .is("deactivated_at", null);

  if (deactivateError) {
    console.error("Failed to deactivate keys:", deactivateError);
    return NextResponse.json({ error: "Failed to deactivate keys" }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    deactivated: keysToDeactivate.length,
    revoked: revokedCount,
  });
}
