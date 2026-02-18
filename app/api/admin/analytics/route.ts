import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const adminClient = createAdminClient();
  const { searchParams } = new URL(req.url);
  
  const type = searchParams.get("type") || "users"; // "users" or "waitlist"
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
  };
  const dbSortColumn = sortColumnMap[sortBy] || "created_at";
  const ascending = sortOrder === "asc";

  if (type === "waitlist") {
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
