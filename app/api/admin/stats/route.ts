import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Plan prices (monthly) for MRR calculation
const PLAN_PRICES: Record<string, number> = {
  creator: 9,
  studio: 29,
  enterprise: 99,
};

export async function GET(req: NextRequest) {
  try {
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

    // Parse date range from query params
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate"); // ISO string or null for lifetime
    const endDate = searchParams.get("endDate"); // ISO string or null for lifetime

    // Use admin client to bypass RLS and get accurate counts
    const adminClient = createAdminClient();

    // Build date-filtered queries for "new" counts
    const buildDateQuery = (table: string) => {
      let query = adminClient.from(table).select("*", { count: "exact", head: true });
      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);
      return query;
    };

    // Build activity queries (users who logged in, studios that had activity)
    const buildActivityQuery = (table: string, field: string) => {
      let query = adminClient.from(table).select("*", { count: "exact", head: true }).not(field, "is", null);
      if (startDate) query = query.gte(field, startDate);
      if (endDate) query = query.lte(field, endDate);
      return query;
    };

    const [
      // Total counts (lifetime)
      { count: userCount },
      { count: studioCount },
      { count: projectCount },
      { count: keyCount },
      { count: usedKeyCount },
      { data: subscriptions },
      // New in period
      { count: newUsers },
      { count: newStudios },
      { count: newProjects },
      // Activity in period (users logged in, studios opened)
      { count: activeUsers },
      { count: activeStudios },
      // Projects opened/worked on (updated_at in period, not created_at)
      { count: activeProjects },
    ] = await Promise.all([
      adminClient.from("profiles").select("*", { count: "exact", head: true }),
      adminClient.from("organizations").select("*", { count: "exact", head: true }),
      adminClient.from("projects").select("*", { count: "exact", head: true }),
      adminClient.from("plan_keys").select("*", { count: "exact", head: true }),
      adminClient.from("plan_keys").select("*", { count: "exact", head: true }).not("redeemed_at", "is", null),
      adminClient.from("subscriptions").select("plan, source, status"),
      // New counts in date range
      buildDateQuery("profiles"),
      buildDateQuery("organizations"),
      buildDateQuery("projects"),
      // Activity counts in date range
      buildActivityQuery("profiles", "last_active_at"),
      buildActivityQuery("organizations", "last_activity_at"),
      // Projects worked on - use updated_at since that's when they were last modified
      (() => {
        let query = adminClient.from("projects").select("*", { count: "exact", head: true });
        if (startDate) query = query.gte("updated_at", startDate);
        if (endDate) query = query.lte("updated_at", endDate);
        return query;
      })(),
    ]);

    // Count subscription types
    const activeSubscriptions = subscriptions?.filter(s => s.status === "active") || [];
    
    // Free: plan is free (never paid)
    const freeCount = activeSubscriptions.filter(s => s.plan === "free" || !s.plan).length;
    
    // Key users: have a paid plan but source is "key" (gifted, not paying)
    const keyUserCount = activeSubscriptions.filter(s => 
      s.plan && s.plan !== "free" && s.source === "key"
    ).length;
    
    // Paid users: have a paid plan AND source is "stripe" (actually paying)
    const paidSubscriptions = activeSubscriptions.filter(s => 
      s.plan && s.plan !== "free" && s.source === "stripe"
    );
    const paidCount = paidSubscriptions.length;

    // Calculate MRR from actual paid users
    const mrr = paidSubscriptions.reduce((total, sub) => {
      return total + (PLAN_PRICES[sub.plan] || 0);
    }, 0);

    return NextResponse.json({
      // Totals (lifetime)
      totalUsers: userCount || 0,
      totalStudios: studioCount || 0,
      totalProjects: projectCount || 0,
      totalKeys: keyCount || 0,
      usedKeys: usedKeyCount || 0,
      freeStudios: freeCount,
      keyStudios: keyUserCount,
      paidStudios: paidCount,
      mrr,
      arr: mrr * 12,
      // New in period
      newUsers: newUsers || 0,
      newStudios: newStudios || 0,
      newProjects: newProjects || 0,
      // Activity in period
      activeUsers: activeUsers || 0,
      activeStudios: activeStudios || 0,
      activeProjects: activeProjects || 0,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
