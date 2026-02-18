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

type SortColumn = "email" | "source" | "medium" | "campaign" | "device" | "location" | "date";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"users" | "waitlist">("users");
  const [data, setData] = useState<(WaitlistEntry | ProfileEntry)[]>([]);
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

  useEffect(() => {
    fetchData();
  }, [tab, page, search, sourceFilter, deviceFilter, sortBy, sortOrder]);

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams({
      type: tab,
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
    const headers = ["email", "source", "medium", "campaign", "device", "country", "city", "date"];
    const rows = data.map((entry) => [
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
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${tab}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
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
            Track where your users come from
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "users" ? "default" : "outline"}
          onClick={() => { setTab("users"); setPage(0); }}
        >
          Users
        </Button>
        <Button
          variant={tab === "waitlist" ? "default" : "outline"}
          onClick={() => { setTab("waitlist"); setPage(0); }}
        >
          Waitlist
        </Button>
      </div>

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
        {(sourceFilter || deviceFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSourceFilter(""); setDeviceFilter(""); setSearch(""); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{totalCount} total {tab === "waitlist" ? "signups" : "users"}</span>
      </div>

      {/* Table */}
      <div className="glass border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
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
              data.map((entry) => (
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
                      <span title={format(new Date(entry.created_at), "PPpp")}>
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
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
