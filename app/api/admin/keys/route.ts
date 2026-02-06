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
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("search") || "";

  // Use admin client to bypass RLS
  const adminClient = createAdminClient();

  // Build query
  let countQuery = adminClient.from("plan_keys").select("*", { count: "exact", head: true });
  let dataQuery = adminClient
    .from("plan_keys")
    .select(`
      id,
      key,
      plan,
      duration,
      created_at,
      redeemed_at,
      redeemed_by,
      redeemed_org_id,
      assigned_org_id,
      sent_to_email,
      sent_at,
      expires_at,
      deactivated_at
    `)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  // Filter logic
  if (filter === "deactivated") {
    countQuery = countQuery.not("deactivated_at", "is", null);
    dataQuery = dataQuery.not("deactivated_at", "is", null);
  } else if (filter === "available") {
    countQuery = countQuery.is("deactivated_at", null).is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
    dataQuery = dataQuery.is("deactivated_at", null).is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
  } else if (filter === "sent") {
    countQuery = countQuery.is("deactivated_at", null).is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
    dataQuery = dataQuery.is("deactivated_at", null).is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
  } else if (filter === "active" || filter === "expired") {
    countQuery = countQuery.is("deactivated_at", null).not("redeemed_at", "is", null);
    dataQuery = dataQuery.is("deactivated_at", null).not("redeemed_at", "is", null);
  }

  if (search) {
    dataQuery = dataQuery.ilike("key", `%${search}%`);
  }

  const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);

  if (!data) {
    return NextResponse.json({ keys: [], totalCount: 0 });
  }

  // Get org and user info for redeemed/assigned keys
  const redeemedOrgIds = data.filter(k => k.redeemed_org_id).map(k => k.redeemed_org_id!);
  const assignedOrgIds = data.filter(k => k.assigned_org_id).map(k => k.assigned_org_id!);
  const allOrgIds = [...new Set([...redeemedOrgIds, ...assignedOrgIds])];
  const userIds = data.filter(k => k.redeemed_by).map(k => k.redeemed_by!);

  // Get subscription info to determine if key is active
  const [{ data: orgs }, { data: users }, { data: subscriptions }] = await Promise.all([
    allOrgIds.length > 0 
      ? adminClient.from("organizations").select("id, name").in("id", allOrgIds)
      : { data: [] },
    userIds.length > 0 
      ? adminClient.from("profiles").select("id, email").in("id", userIds)
      : { data: [] },
    redeemedOrgIds.length > 0
      ? adminClient.from("subscriptions").select("organization_id, plan, source, status").in("organization_id", redeemedOrgIds)
      : { data: [] },
  ]);

  // Build a map of org_id -> active subscription info
  const orgSubscriptions = new Map<string, { plan: string; source: string; status: string }>();
  subscriptions?.forEach(sub => {
    orgSubscriptions.set(sub.organization_id, { plan: sub.plan, source: sub.source, status: sub.status });
  });

  let mappedKeys = data.map(key => {
    // A key is "active" if:
    // 1. It's redeemed to an org
    // 2. That org's current subscription source is 'key' AND plan matches
    let isActive = false;
    if (key.redeemed_org_id && key.redeemed_at) {
      const sub = orgSubscriptions.get(key.redeemed_org_id);
      if (sub && sub.source === "key" && sub.plan === key.plan && sub.status === "active") {
        isActive = true;
      }
    }
    
    return {
      ...key,
      redeemed_org: orgs?.find(o => o.id === key.redeemed_org_id) || null,
      assigned_org: orgs?.find(o => o.id === key.assigned_org_id) || null,
      redeemed_user: users?.find(u => u.id === key.redeemed_by) || null,
      is_active: isActive,
    };
  });

  // Client-side filter for active/expired
  if (filter === "active") {
    mappedKeys = mappedKeys.filter(k => k.redeemed_at && k.is_active);
  } else if (filter === "expired") {
    mappedKeys = mappedKeys.filter(k => k.redeemed_at && !k.is_active);
  }

  return NextResponse.json({ keys: mappedKeys, totalCount: count || 0 });
}
