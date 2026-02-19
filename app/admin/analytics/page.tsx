"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Activity,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
}

interface ProfileEntry {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
}

interface UserActivityStats {
  id: string;
  user_id: string;
  email: string;
  country: string | null;
  city: string | null;
  desktop_logins: number;
  mobile_logins: number;
  tablet_logins: number;
  desktop_time_seconds: number;
  mobile_time_seconds: number;
  tablet_time_seconds: number;
  total_logins: number;
  total_time_seconds: number;
  last_login_at: string | null;
  last_activity_at: string | null;
}

type SortColumn = "email" | "source" | "medium" | "campaign" | "device" | "location" | "date" | "totalLogins" | "desktopLogins" | "mobileLogins" | "tabletLogins" | "totalTime" | "desktopTime" | "mobileTime" | "tabletTime" | "lastLogin";
type SortOrder = "asc" | "desc";
type View = "registrations" | "activity";
type RegistrationTab = "users" | "waitlist";

const ITEMS_PER_PAGE = 20;

// Format seconds into human-readable duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function AnalyticsPage() {
  const [view, setView] = useState<View>("registrations");
  const [registrationTab, setRegistrationTab] = useState<RegistrationTab>("users");
  const [data, setData] = useState<(WaitlistEntry | ProfileEntry | UserActivityStats)[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortColumn>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Get the actual type to send to API
  const getApiType = () => {
    if (view === "activity") return "activity";
    return registrationTab;
  };

  useEffect(() => {
    fetchData();
  }, [view, registrationTab, page, search, sourceFilter, deviceFilter, sortBy, sortOrder]);

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams({
      type: getApiType(),
      page: String(page),
      sortBy,
      sortOrder,
      ...(search && { search }),
      ...(sourceFilter && { source: sourceFilter }),
      ...(deviceFilter && { device: deviceFilter }),
    });

    const res = await fetch(`/api/admin/analytics?${params}`);
    const result = await res.json();

    if (result.error) {
      toast.error("Failed to load analytics data");
    } else {
      setData(result.data || []);
      setTotalCount(result.count || 0);
      setAvailableSources(result.sources || []);
      setAvailableDevices(result.devices || []);
    }
    setLoading(false);
  }

  function handleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(0);
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  }

  function exportCSV() {
    if (view === "activity") {
      const headers = ["email", "country", "city", "desktop_logins", "mobile_logins", "tablet_logins", "total_logins", "desktop_time", "mobile_time", "tablet_time", "total_time", "last_login"];
      const rows = (data as UserActivityStats[]).map((entry) => [
        entry.email,
        entry.country || "",
        entry.city || "",
        entry.desktop_logins,
        entry.mobile_logins,
        entry.tablet_logins,
        entry.total_logins,
        formatDuration(entry.desktop_time_seconds),
        formatDuration(entry.mobile_time_seconds),
        formatDuration(entry.tablet_time_seconds),
        formatDuration(entry.total_time_seconds),
        entry.last_login_at ? format(new Date(entry.last_login_at), "yyyy-MM-dd HH:mm") : "",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      downloadCSV(csv, `analytics-activity-${format(new Date(), "yyyy-MM-dd")}.csv`);
    } else {
      const headers = ["email", "source", "medium", "campaign", "device", "country", "city", "date"];
      const rows = (data as (WaitlistEntry | ProfileEntry)[]).map((entry) => [
        entry.email,
        entry.utm_source || "",
        entry.utm_medium || "",
        entry.utm_campaign || "",
        entry.device_type || "",
        entry.country || "",
        entry.city || "",
        format(new Date(entry.created_at), "yyyy-MM-dd HH:mm"),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      downloadCSV(csv, `analytics-${registrationTab}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    }
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  }

  function resetFilters() {
    setSourceFilter("");
    setDeviceFilter("");
    setSearch("");
    setPage(0);
  }

  function handleViewChange(newView: View) {
    setView(newView);
    resetFilters();
    setSortBy("date");
    setSortOrder("desc");
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const DeviceIcon = ({ type }: { type: string | null }) => {
    if (type === "mobile") return <Smartphone className="w-4 h-4" />;
    if (type === "tablet") return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track registrations and user activity
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Top Level View Toggle */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
        <Button
          variant={view === "registrations" ? "default" : "ghost"}
          onClick={() => handleViewChange("registrations")}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Registrations
        </Button>
        <Button
          variant={view === "activity" ? "default" : "ghost"}
          onClick={() => handleViewChange("activity")}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          Activity
        </Button>
      </div>

      {/* Sub-tabs for Registrations view */}
      {view === "registrations" && (
        <div className="flex gap-2">
          <Button
            variant={registrationTab === "users" ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setRegistrationTab("users"); setPage(0); resetFilters(); }}
          >
            Users
          </Button>
          <Button
            variant={registrationTab === "waitlist" ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setRegistrationTab("waitlist"); setPage(0); resetFilters(); }}
          >
            Waitlist
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        {view === "registrations" && (
          <>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All Sources</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={deviceFilter}
              onChange={(e) => { setDeviceFilter(e.target.value); setPage(0); }}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All Devices</option>
              {availableDevices.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </>
        )}
        {(sourceFilter || deviceFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          {totalCount} total {view === "activity" 
            ? "users" 
            : registrationTab === "waitlist" 
              ? "signups" 
              : "users"}
        </span>
      </div>

      {/* Table */}
      <div className="glass border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          {view === "activity" ? (
            <>
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th 
                    onClick={() => handleSort("email")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Email <SortIcon column="email" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("location")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Location <SortIcon column="location" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("totalLogins")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Total Logins <SortIcon column="totalLogins" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("desktopLogins")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Monitor className="w-4 h-4" /> <SortIcon column="desktopLogins" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("mobileLogins")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Smartphone className="w-4 h-4" /> <SortIcon column="mobileLogins" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("tabletLogins")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Tablet className="w-4 h-4" /> <SortIcon column="tabletLogins" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("totalTime")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> Total <SortIcon column="totalTime" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("desktopTime")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Monitor className="w-4 h-4" /> <SortIcon column="desktopTime" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("mobileTime")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Smartphone className="w-4 h-4" /> <SortIcon column="mobileTime" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("tabletTime")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1"><Tablet className="w-4 h-4" /> <SortIcon column="tabletTime" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("lastLogin")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Last Login <SortIcon column="lastLogin" /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No activity found
                    </td>
                  </tr>
                ) : (
                  (data as UserActivityStats[]).map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <span className="font-medium">{entry.email}</span>
                      </td>
                      <td className="p-4">
                        {entry.country || entry.city ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {[entry.city, entry.country].filter(Boolean).join(", ") || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{entry.total_logins}</Badge>
                      </td>
                      <td className="p-4 text-sm">{entry.desktop_logins}</td>
                      <td className="p-4 text-sm">{entry.mobile_logins}</td>
                      <td className="p-4 text-sm">{entry.tablet_logins}</td>
                      <td className="p-4">
                        <span className="text-sm font-medium">
                          {entry.total_time_seconds > 0 ? formatDuration(entry.total_time_seconds) : "—"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {entry.desktop_time_seconds > 0 ? formatDuration(entry.desktop_time_seconds) : "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {entry.mobile_time_seconds > 0 ? formatDuration(entry.mobile_time_seconds) : "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {entry.tablet_time_seconds > 0 ? formatDuration(entry.tablet_time_seconds) : "—"}
                      </td>
                      <td className="p-4">
                        {entry.last_login_at ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(entry.last_login_at), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          ) : (
            <>
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th 
                    onClick={() => handleSort("email")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Email <SortIcon column="email" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("source")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Source <SortIcon column="source" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("medium")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Medium <SortIcon column="medium" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("campaign")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Campaign <SortIcon column="campaign" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("device")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Device <SortIcon column="device" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("location")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Location <SortIcon column="location" /></div>
                  </th>
                  <th 
                    onClick={() => handleSort("date")} 
                    className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No data found
                    </td>
                  </tr>
                ) : (
                  (data as (WaitlistEntry | ProfileEntry)[]).map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <span className="font-medium">{entry.email}</span>
                      </td>
                      <td className="p-4">
                        {entry.utm_source ? (
                          <Badge variant="secondary">{entry.utm_source}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {entry.utm_medium ? (
                          <Badge variant="outline">{entry.utm_medium}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {entry.utm_campaign ? (
                          <span className="text-sm">{entry.utm_campaign}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <DeviceIcon type={entry.device_type} />
                          <span className="text-sm capitalize">{entry.device_type || "—"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {entry.country || entry.city ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {[entry.city, entry.country].filter(Boolean).join(", ") || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
