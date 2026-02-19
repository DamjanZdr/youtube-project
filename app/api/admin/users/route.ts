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
  let countQuery = adminClient.from("profiles").select("*", { count: "exact", head: true });
  if (search) {
    countQuery = countQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  const { count } = await countQuery;

  // Get users
  let query = adminClient
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      created_at,
      last_active_at,
      country,
      city
    `)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles) {
    return NextResponse.json({ users: [], totalCount: 0 });
  }

  // Get organizations for each user
  const userIds = profiles.map(p => p.id);
  const { data: memberships } = await adminClient
    .from("organization_members")
    .select(`
      user_id,
      organization_id
    `)
    .in("user_id", userIds);

  // Get org details
  const orgIds = [...new Set(memberships?.map(m => m.organization_id) || [])];
  const { data: orgs } = orgIds.length > 0
    ? await adminClient.from("organizations").select("id, name, slug").in("id", orgIds)
    : { data: [] };

  const usersWithOrgs = profiles.map(profile => ({
    ...profile,
    organizations: memberships
      ?.filter(m => m.user_id === profile.id)
      .map(m => orgs?.find(o => o.id === m.organization_id))
      .filter(Boolean) || [],
  }));

  return NextResponse.json({ users: usersWithOrgs, totalCount: count || 0 });
}
