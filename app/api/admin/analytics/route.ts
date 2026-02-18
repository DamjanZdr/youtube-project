import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const adminClient = createAdminClient();

  // Waitlist signups by source
  const { data: waitlistBySource } = await adminClient
    .from("waitlist")
    .select("utm_source, count:id")
    .group("utm_source");

  // Registrations by source
  const { data: registrationsBySource } = await adminClient
    .from("profiles")
    .select("utm_source, count:id")
    .group("utm_source");

  // Device breakdown (waitlist + profiles)
  const { data: waitlistDevices } = await adminClient
    .from("waitlist")
    .select("device_type, count:id")
    .group("device_type");
  const { data: profileDevices } = await adminClient
    .from("profiles")
    .select("device_type, count:id")
    .group("device_type");

  // Country breakdown (waitlist + profiles)
  const { data: waitlistCountries } = await adminClient
    .from("waitlist")
    .select("country, count:id")
    .group("country");
  const { data: profileCountries } = await adminClient
    .from("profiles")
    .select("country, count:id")
    .group("country");

  return Response.json({
    waitlistBySource,
    registrationsBySource,
    waitlistDevices,
    profileDevices,
    waitlistCountries,
    profileCountries,
  });
}
