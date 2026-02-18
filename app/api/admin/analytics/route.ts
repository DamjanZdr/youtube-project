import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const adminClient = createAdminClient();
  const { searchParams } = new URL(req.url);
  
  const type = searchParams.get("type") || "users"; // "users", "waitlist", or "activity"
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";
  const device = searchParams.get("device") || "";
  const eventType = searchParams.get("eventType") || "";
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
    event: "event_type",
  };
  const dbSortColumn = sortColumnMap[sortBy] || "created_at";
  const ascending = sortOrder === "asc";

  if (type === "activity") {
    // Fetch activity events with user email from profiles
    let query = adminClient
      .from("analytics_events")
      .select(`
        id,
        event_type,
        device_type,
        platform,
        created_at,
        user_id,
        profiles!inner(email)
      `, { count: "exact" });

    if (search) query = query.ilike("profiles.email", `%${search}%`);
    if (device) query = query.eq("device_type", device);
    if (eventType) query = query.eq("event_type", eventType);

    const { data, count, error } = await query
      .order("created_at", { ascending })
      .range(page * limit, (page + 1) * limit - 1);

    // Get unique event types and devices for filters
    const { data: allEvents } = await adminClient
      .from("analytics_events")
      .select("event_type, device_type");
    
    const eventTypes = [...new Set(allEvents?.map(e => e.event_type).filter(Boolean))];
    const devices = [...new Set(allEvents?.map(e => e.device_type).filter(Boolean))];

    // Flatten the data to include email directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flattenedData = data?.map((event: any) => {
      const profiles = event.profiles;
      const email = Array.isArray(profiles) 
        ? profiles[0]?.email 
        : profiles?.email;
      return {
        ...event,
        email: email || "Unknown",
        profiles: undefined,
      };
    });

    return Response.json({ 
      data: flattenedData, 
      count, 
      eventTypes, 
      devices, 
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
