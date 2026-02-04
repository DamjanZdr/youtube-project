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

  // Get the keys to be deleted
  const { data: keysToDelete, error: fetchError } = await adminClient
    .from("plan_keys")
    .select("id, plan, redeemed_org_id, redeemed_at")
    .in("id", keyIds);

  if (fetchError) {
    console.error("Failed to fetch keys:", fetchError);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }

  // Find active keys (redeemed and currently powering an org's subscription)
  const redeemedOrgIds = keysToDelete
    ?.filter(k => k.redeemed_org_id && k.redeemed_at)
    .map(k => k.redeemed_org_id!) || [];

  let revokedCount = 0;

  if (redeemedOrgIds.length > 0) {
    // Get subscriptions for these orgs that are key-based
    const { data: subscriptions } = await adminClient
      .from("subscriptions")
      .select("id, organization_id, plan, source")
      .in("organization_id", redeemedOrgIds)
      .eq("source", "key");

    if (subscriptions && subscriptions.length > 0) {
      // For each subscription that matches a key being deleted, downgrade to free
      for (const sub of subscriptions) {
        // Check if this subscription's plan matches any of the keys being deleted for this org
        const matchingKey = keysToDelete?.find(
          k => k.redeemed_org_id === sub.organization_id && k.plan === sub.plan
        );

        if (matchingKey) {
          // Revoke: downgrade to free
          const { error: updateError } = await adminClient
            .from("subscriptions")
            .update({
              plan: "free",
              source: "revoked",
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

  // Delete the keys
  const { error: deleteError } = await adminClient
    .from("plan_keys")
    .delete()
    .in("id", keyIds);

  if (deleteError) {
    console.error("Failed to delete keys:", deleteError);
    return NextResponse.json({ error: "Failed to delete keys" }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    deleted: keyIds.length,
    revoked: revokedCount,
  });
}
