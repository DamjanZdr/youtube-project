import { createAdminClient } from "@/lib/supabase/server";

// Helper to group and count by a field
function groupAndCount<T extends Record<string, unknown>>(data: T[] | null, field: keyof T) {
  if (!data) return [];
  const counts: Record<string, number> = {};
  for (const row of data) {
    const key = String(row[field] ?? "(none)");
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([value, count]) => ({ [field]: value, count }));
}

export async function GET() {
  const adminClient = createAdminClient();

  // Fetch raw data
  const [
    { data: waitlistRaw },
    { data: profilesRaw },
  ] = await Promise.all([
    adminClient.from("waitlist").select("utm_source, device_type, country"),
    adminClient.from("profiles").select("utm_source, device_type, country"),
  ]);

  // Aggregate in JS
  const waitlistBySource = groupAndCount(waitlistRaw, "utm_source");
  const registrationsBySource = groupAndCount(profilesRaw, "utm_source");
  const waitlistDevices = groupAndCount(waitlistRaw, "device_type");
  const profileDevices = groupAndCount(profilesRaw, "device_type");
  const waitlistCountries = groupAndCount(waitlistRaw, "country");
  const profileCountries = groupAndCount(profilesRaw, "country");

  return Response.json({
    waitlistBySource,
    registrationsBySource,
    waitlistDevices,
    profileDevices,
    waitlistCountries,
    profileCountries,
  });
}
