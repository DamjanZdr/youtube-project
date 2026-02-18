import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // First verify the user is an admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";

  // Use admin client to bypass RLS
  const adminClient = createAdminClient();

  // Get total count
  let countQuery = adminClient.from("organizations").select("*", { count: "exact", head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  const { count } = await countQuery;

  // Get studios/organizations
  let query = adminClient
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      logo_url,
      owner_id,
      created_at,
      last_activity_at
    `)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data: studios, error } = await query;

  if (error) {
    console.error("Error fetching studios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!studios) {
    return NextResponse.json({ studios: [], totalCount: 0 });
  }

  // Get subscriptions and member counts for each studio
  const studioIds = studios.map(s => s.id);
  const ownerIds = studios.map(s => s.owner_id);

  const [
    { data: subscriptions },
    { data: memberCounts },
    { data: owners }
  ] = await Promise.all([
    adminClient.from("subscriptions").select("organization_id, plan, source, status").in("organization_id", studioIds),
    adminClient.from("organization_members").select("organization_id").in("organization_id", studioIds),
    adminClient.from("profiles").select("id, email, full_name").in("id", ownerIds),
  ]);

  // Count members per org
  const memberCountMap = new Map<string, number>();
  memberCounts?.forEach(m => {
    memberCountMap.set(m.organization_id, (memberCountMap.get(m.organization_id) || 0) + 1);
  });

  // Map subscription info
  const subMap = new Map<string, { plan: string; source: string | null; status: string }>();
  subscriptions?.forEach(s => {
    subMap.set(s.organization_id, { plan: s.plan, source: s.source, status: s.status });
  });

  // Map owner info
  const ownerMap = new Map<string, { email: string; full_name: string | null }>();
  owners?.forEach(o => {
    ownerMap.set(o.id, { email: o.email, full_name: o.full_name });
  });

  const studiosWithDetails = studios.map(studio => ({
    ...studio,
    subscription: subMap.get(studio.id) || { plan: "free", source: null, status: "active" },
    member_count: memberCountMap.get(studio.id) || 1,
    owner: ownerMap.get(studio.owner_id) || null,
  }));

  return NextResponse.json({ studios: studiosWithDetails, totalCount: count || 0 });
}
