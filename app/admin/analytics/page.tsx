"use client";
import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";

export default function AnalyticsPage() {
  const { data, error, isLoading } = useAnalyticsData();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <p className="text-muted-foreground mb-4">
        Sign-up attribution, device, and location analytics for both waitlist and registered users.
      </p>
      {isLoading && <div>Loading analytics...</div>}
      {error && <div className="text-red-500">Failed to load analytics.</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h2 className="font-semibold mb-2">Waitlist by Source</h2>
            <ul className="text-sm">
              {data.waitlistBySource?.map((row: any) => (
                <li key={row.utm_source || "unknown"}>
                  <span className="font-medium">{row.utm_source || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Registrations by Source</h2>
            <ul className="text-sm">
              {data.registrationsBySource?.map((row: any) => (
                <li key={row.utm_source || "unknown"}>
                  <span className="font-medium">{row.utm_source || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Devices (Waitlist)</h2>
            <ul className="text-sm">
              {data.waitlistDevices?.map((row: any) => (
                <li key={row.device_type || "unknown"}>
                  <span className="font-medium">{row.device_type || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
            <h2 className="font-semibold mt-4 mb-2">Devices (Registrations)</h2>
            <ul className="text-sm">
              {data.profileDevices?.map((row: any) => (
                <li key={row.device_type || "unknown"}>
                  <span className="font-medium">{row.device_type || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Countries (Waitlist)</h2>
            <ul className="text-sm">
              {data.waitlistCountries?.map((row: any) => (
                <li key={row.country || "unknown"}>
                  <span className="font-medium">{row.country || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
            <h2 className="font-semibold mt-4 mb-2">Countries (Registrations)</h2>
            <ul className="text-sm">
              {data.profileCountries?.map((row: any) => (
                <li key={row.country || "unknown"}>
                  <span className="font-medium">{row.country || "(none)"}:</span> {row.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
