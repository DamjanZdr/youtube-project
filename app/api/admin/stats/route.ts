import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
    { count: userCount },
    { count: studioCount },
    { count: projectCount },
    { count: keyCount },
    { count: usedKeyCount },
    { data: subscriptions },
    { count: weeklySignups },
  ] = await Promise.all([
    adminClient.from("profiles").select("*", { count: "exact", head: true }),
    adminClient.from("organizations").select("*", { count: "exact", head: true }),
    adminClient.from("projects").select("*", { count: "exact", head: true }),
    adminClient.from("plan_keys").select("*", { count: "exact", head: true }),
    adminClient.from("plan_keys").select("*", { count: "exact", head: true }).not("redeemed_at", "is", null),
    adminClient.from("subscriptions").select("plan"),
    adminClient.from("profiles").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const freeCount = subscriptions?.filter(s => s.plan === "free" || !s.plan).length || 0;
  const paidCount = subscriptions?.filter(s => s.plan && s.plan !== "free").length || 0;

  return NextResponse.json({
    totalUsers: userCount || 0,
    totalStudios: studioCount || 0,
    totalProjects: projectCount || 0,
    totalKeys: keyCount || 0,
    usedKeys: usedKeyCount || 0,
    freeStudios: freeCount,
    paidStudios: paidCount,
    signupsThisWeek: weeklySignups || 0,
  });
}
