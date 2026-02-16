import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Hard delete deactivated keys (permanent removal)
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

  // Only allow deleting keys that are already deactivated
  const { data: keysToDelete, error: fetchError } = await adminClient
    .from("plan_keys")
    .select("id")
    .in("id", keyIds)
    .not("deactivated_at", "is", null); // Must be deactivated

  if (fetchError) {
    console.error("Failed to fetch keys:", fetchError);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }

  if (!keysToDelete || keysToDelete.length === 0) {
    return NextResponse.json({ error: "No deactivated keys to delete. Keys must be deactivated first." }, { status: 400 });
  }

  const idsToDelete = keysToDelete.map(k => k.id);

  // Hard delete the keys
  const { error: deleteError } = await adminClient
    .from("plan_keys")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("Failed to delete keys:", deleteError);
    return NextResponse.json({ error: "Failed to delete keys" }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    deleted: idsToDelete.length,
  });
}
