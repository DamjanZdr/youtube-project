import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const adminClient = createAdminClient();
  const { searchParams } = new URL(req.url);
  
  const type = searchParams.get("type") || "users"; // "users", "waitlist", or "activity"
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";
  const device = searchParams.get("device") || "";
  const page = parseInt(searchParams.get("page") || "0");
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const limit = 20;

  // Map frontend column names to database columns
  const sortColumnMap: Record<string, string> = {
    email: "email",
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    device: "device_type",
    location: "country",
    date: "created_at",
    lastLogin: "last_login_at",
    totalLogins: "total_logins",
    totalTime: "total_time",
  };
  const dbSortColumn = sortColumnMap[sortBy] || "created_at";
  const ascending = sortOrder === "asc";

  if (type === "activity") {
    // Fetch aggregated user activity stats with user email from profiles
    let query = adminClient
      .from("user_activity_stats")
      .select(`
        id,
        user_id,
        desktop_logins,
        mobile_logins,
        tablet_logins,
        desktop_time_seconds,
        mobile_time_seconds,
        tablet_time_seconds,
        last_login_at,
        last_activity_at,
        created_at,
        profiles!inner(email)
      `, { count: "exact" });

    if (search) query = query.ilike("profiles.email", `%${search}%`);

    const { data, count, error } = await query
      .order("last_login_at", { ascending, nullsFirst: false })
      .range(page * limit, (page + 1) * limit - 1);

    // Flatten the data to include email directly and compute totals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flattenedData = data?.map((stats: any) => {
      const profiles = stats.profiles;
      const email = Array.isArray(profiles) 
        ? profiles[0]?.email 
        : profiles?.email;
      
      const totalLogins = (stats.desktop_logins || 0) + (stats.mobile_logins || 0) + (stats.tablet_logins || 0);
      const totalTimeSeconds = (stats.desktop_time_seconds || 0) + (stats.mobile_time_seconds || 0) + (stats.tablet_time_seconds || 0);
      
      return {
        id: stats.id,
        user_id: stats.user_id,
        email: email || "Unknown",
        desktop_logins: stats.desktop_logins || 0,
        mobile_logins: stats.mobile_logins || 0,
        tablet_logins: stats.tablet_logins || 0,
        desktop_time_seconds: stats.desktop_time_seconds || 0,
        mobile_time_seconds: stats.mobile_time_seconds || 0,
        tablet_time_seconds: stats.tablet_time_seconds || 0,
        total_logins: totalLogins,
        total_time_seconds: totalTimeSeconds,
        last_login_at: stats.last_login_at,
        last_activity_at: stats.last_activity_at,
      };
    });

    return Response.json({ 
      data: flattenedData, 
      count, 
      error: error?.message 
    });
  } else if (type === "waitlist") {
    let query = adminClient
      .from("waitlist")
      .select("id, email, created_at, utm_source, utm_medium, utm_campaign, device_type, country, city", { count: "exact" });

    if (search) query = query.ilike("email", `%${search}%`);
    if (source) query = query.eq("utm_source", source);
    if (device) query = query.eq("device_type", device);

    const { data, count, error } = await query
      .order(dbSortColumn, { ascending })
      .range(page * limit, (page + 1) * limit - 1);

    // Get unique sources and devices for filters
    const { data: allWaitlist } = await adminClient
      .from("waitlist")
      .select("utm_source, device_type");
    
    const sources = [...new Set(allWaitlist?.map(w => w.utm_source).filter(Boolean))];
    const devices = [...new Set(allWaitlist?.map(w => w.device_type).filter(Boolean))];

    return Response.json({ data, count, sources, devices, error: error?.message });
  } else {
    let query = adminClient
      .from("profiles")
      .select("id, email, full_name, created_at, utm_source, utm_medium, utm_campaign, device_type, country, city", { count: "exact" });

    if (search) query = query.ilike("email", `%${search}%`);
    if (source) query = query.eq("utm_source", source);
    if (device) query = query.eq("device_type", device);

    const { data, count, error } = await query
      .order(dbSortColumn, { ascending })
      .range(page * limit, (page + 1) * limit - 1);

    // Get unique sources and devices for filters
    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("utm_source, device_type");
    
    const sources = [...new Set(allProfiles?.map(p => p.utm_source).filter(Boolean))];
    const devices = [...new Set(allProfiles?.map(p => p.device_type).filter(Boolean))];

    return Response.json({ data, count, sources, devices, error: error?.message });
  }
}
