import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Plan prices (monthly) for MRR calculation
const PLAN_PRICES: Record<string, number> = {
  creator: 9,
  studio: 29,
  enterprise: 99,
};

export async function GET() {
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

    // Use admin client to bypass RLS and get accurate counts
    const adminClient = createAdminClient();

    const [
      { count: userCount, error: userError },
      { count: studioCount, error: studioError },
      { count: projectCount, error: projectError },
      { count: keyCount, error: keyError },
      { count: usedKeyCount },
      { data: subscriptions },
      { count: weeklySignups },
    ] = await Promise.all([
      adminClient.from("profiles").select("*", { count: "exact", head: true }),
      adminClient.from("organizations").select("*", { count: "exact", head: true }),
      adminClient.from("projects").select("*", { count: "exact", head: true }),
      adminClient.from("plan_keys").select("*", { count: "exact", head: true }),
      adminClient.from("plan_keys").select("*", { count: "exact", head: true }).not("redeemed_at", "is", null),
      adminClient.from("subscriptions").select("plan, source, status"),
      adminClient.from("profiles").select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Log any errors for debugging
    if (userError) console.error("User count error:", userError);
    if (studioError) console.error("Studio count error:", studioError);
    if (projectError) console.error("Project count error:", projectError);
    if (keyError) console.error("Key count error:", keyError);

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
      signupsThisWeek: weeklySignups || 0,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
