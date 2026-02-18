import useSWR from "swr";

export function useAnalyticsData() {
  return useSWR("/api/admin/analytics", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  });
}
