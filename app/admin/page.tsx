"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Building2, 
  Key, 
  CreditCard,
  TrendingUp,
  UserPlus
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalStudios: number;
  totalProjects: number;
  totalKeys: number;
  usedKeys: number;
  freeStudios: number;
  paidStudios: number;
  signupsThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudios: 0,
    totalProjects: 0,
    totalKeys: 0,
    usedKeys: 0,
    freeStudios: 0,
    paidStudios: 0,
    signupsThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/admin/stats");
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
  }, []);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Studios", value: stats.totalStudios, icon: Building2, color: "from-purple-500 to-pink-500" },
    { label: "Projects", value: stats.totalProjects, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { label: "Signups (7d)", value: stats.signupsThisWeek, icon: UserPlus, color: "from-orange-500 to-yellow-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Overview of your platform</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => {
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
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium text-green-400">{stats.paidStudios}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                style={{ width: `${stats.totalStudios ? (stats.paidStudios / stats.totalStudios * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudios ? Math.round(stats.paidStudios / stats.totalStudios * 100) : 0}% conversion rate
            </p>
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

        {/* Quick Actions */}
        <div className="glass-card p-4 md:p-5">
          <h3 className="font-semibold text-sm md:text-base mb-4">Quick Actions</h3>
          <div className="space-y-2">
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
      </div>
    </div>
  );
}
