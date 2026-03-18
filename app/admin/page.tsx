"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Building2, 
  Key, 
  CreditCard,
  TrendingUp,
  UserPlus,
  DollarSign,
  Gift,
  Activity,
  FolderOpen,
  CalendarDays,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

type DatePreset = "7d" | "30d" | "month" | "custom" | "lifetime";

interface Stats {
  // Totals (lifetime)
  totalUsers: number;
  totalStudios: number;
  totalProjects: number;
  totalKeys: number;
  usedKeys: number;
  freeStudios: number;
  keyStudios: number;
  paidStudios: number;
  mrr: number;
  arr: number;
  // Growth (in period)
  newUsers: number;
  newStudios: number;
  newProjects: number;
  // Activity (in period)
  activeUsers: number;
  activeStudios: number;
  activeProjects: number;
}

const defaultStats: Stats = {
  totalUsers: 0,
  totalStudios: 0,
  totalProjects: 0,
  totalKeys: 0,
  usedKeys: 0,
  freeStudios: 0,
  keyStudios: 0,
  paidStudios: 0,
  mrr: 0,
  arr: 0,
  newUsers: 0,
  newStudios: 0,
  newProjects: 0,
  activeUsers: 0,
  activeStudios: 0,
  activeProjects: 0,
};

// Generate month options for the last 12 months
function getMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    months.push({
      label: format(date, "MMMM yyyy"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
  }
  return months;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [loading, setLoading] = useState(true);
  
  // Date range state
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<{ start: Date; end: Date } | null>(null);
  
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "month":
        return selectedMonth || { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        return {
          start: customStart ? new Date(customStart) : null,
          end: customEnd ? new Date(customEnd) : null,
        };
      case "lifetime":
      default:
        return { start: null, end: null };
    }
  }, [preset, customStart, customEnd, selectedMonth]);

  // Load stats whenever date range changes
  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateRange.start) params.set("startDate", dateRange.start.toISOString());
        if (dateRange.end) params.set("endDate", dateRange.end.toISOString());
        
        const response = await fetch(`/api/admin/stats?${params}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to load admin stats:", error);
      }
      setLoading(false);
    }

    loadStats();
  }, [dateRange]);

  // Get label for current selection
  const getDateLabel = () => {
    switch (preset) {
      case "7d": return "Last 7 days";
      case "30d": return "Last 30 days";
      case "month": return selectedMonth ? format(selectedMonth.start, "MMMM yyyy") : "This month";
      case "custom": return customStart && customEnd 
        ? `${format(new Date(customStart), "MMM d")} - ${format(new Date(customEnd), "MMM d, yyyy")}`
        : "Custom range";
      case "lifetime": return "Lifetime";
      default: return "Select range";
    }
  };

  const totalStatCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Studios", value: stats.totalStudios, icon: Building2, color: "from-purple-500 to-pink-500" },
    { label: "Projects", value: stats.totalProjects, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Overview of your platform</p>
        </div>
        
        {/* Date Range Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto min-w-[200px] justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>{getDateLabel()}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setPreset("7d")}>
              Last 7 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPreset("30d")}>
              Last 30 days
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Month options */}
            {monthOptions.slice(0, 6).map((month, i) => (
              <DropdownMenuItem 
                key={i}
                onClick={() => {
                  setSelectedMonth({ start: month.start, end: month.end });
                  setPreset("month");
                }}
              >
                {month.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreset("lifetime")}>
              Lifetime (all time)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">Custom range</p>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    setPreset("custom");
                  }}
                  className="h-8 text-xs"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    setPreset("custom");
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Total Stats (Lifetime) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {totalStatCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass-card p-3 md:p-5">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl md:text-3xl font-bold">{stat.value.toLocaleString()}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Growth & Activity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Growth (New in period) */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Growth</h3>
                  <p className="text-xs text-muted-foreground">New registrations in period</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground">New Users</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.newUsers.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span className="text-muted-foreground">New Studios</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.newStudios.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-muted-foreground">New Projects</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.newProjects.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Activity (Active in period) */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Activity</h3>
                  <p className="text-xs text-muted-foreground">Active usage in period</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground">Users Logged In</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.activeUsers.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span className="text-muted-foreground">Studios Opened</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.activeStudios.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-green-400" />
                    <span className="text-muted-foreground">Projects Worked On</span>
                  </div>
                  <span className="font-semibold text-lg">{stats.activeProjects.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Subscription Breakdown */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Subscriptions</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Free</span>
                  <span className="font-medium">{stats.freeStudios}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-muted-foreground">Key (Gifted)</span>
                  </div>
                  <span className="font-medium text-purple-400">{stats.keyStudios}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-muted-foreground">Paying</span>
                  </div>
                  <span className="font-medium text-green-400">{stats.paidStudios}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${stats.totalStudios ? (stats.paidStudios / stats.totalStudios * 100) : 0}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-500"
                    style={{ width: `${stats.totalStudios ? (stats.keyStudios / stats.totalStudios * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalStudios ? Math.round(stats.paidStudios / stats.totalStudios * 100) : 0}% paid • {stats.totalStudios ? Math.round(stats.keyStudios / stats.totalStudios * 100) : 0}% gifted
                </p>
              </div>
            </div>

            {/* Revenue */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Revenue</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">MRR</span>
                  <span className="font-medium text-green-400">${stats.mrr.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ARR</span>
                  <span className="font-medium text-green-400">${stats.arr.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Paying Studios</span>
                    <span className="font-medium">{stats.paidStudios}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keys */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm md:text-base">Redemption Keys</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Generated</span>
                  <span className="font-medium">{stats.totalKeys}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium text-blue-400">{stats.usedKeys}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-green-400">{stats.totalKeys - stats.usedKeys}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="font-semibold text-sm md:text-base mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <a 
                href="/admin/keys" 
                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span>Generate Keys</span>
                </div>
              </a>
              <a 
                href="/admin/studios" 
                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>Manage Studios</span>
                </div>
              </a>
              <a 
                href="/admin/users" 
                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>View Users</span>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
