"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Copy,
  MousePointer,
  UserPlus,
  Building2,
  DollarSign,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Globe,
  Calendar,
  FolderKanban,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

interface PartnerStats {
  total_visits: number;
  unique_visitors: number;
  total_signups: number;
  total_studios: number;
  total_projects: number;
  conversion_rate: number;
  studios_by_plan: Record<string, number>;
  total_earnings_cents: number;
  paid_out_cents: number;
  pending_payout_cents: number;
}

interface ReferredStudio {
  id: string;
  created_at: string;
  plan: string;
  project_count: number;
}

interface PartnerData {
  partner: {
    id: string;
    code: string;
    name: string;
    commission_percent: number;
    is_active: boolean;
    created_at: string;
  };
  stats: PartnerStats;
  charts: {
    visits_by_country: Record<string, number>;
    visits_by_day: Record<string, number>;
    signups_by_day: Record<string, number>;
  };
  referred_studios: ReferredStudio[];
  payouts: Array<{
    id: string;
    amount_cents: number;
    period_start: string;
    period_end: string;
    status: string;
    paid_at: string | null;
  }>;
}

const planColors: Record<string, string> = {
  free: "text-zinc-400",
  creator: "text-blue-400",
  studio: "text-purple-400",
  enterprise: "text-orange-400",
};

const planBgColors: Record<string, string> = {
  free: "from-zinc-500 to-zinc-600",
  creator: "from-blue-500 to-cyan-500",
  studio: "from-purple-500 to-pink-500",
  enterprise: "from-orange-500 to-yellow-500",
};

export default function PartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PartnerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadPartnerData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const response = await fetch("/api/partners/me");
        if (response.status === 403) {
          setError("You are not registered as a partner.");
          setLoading(false);
          return;
        }
        if (!response.ok) throw new Error("Failed to load data");
        
        const partnerData = await response.json();
        setData(partnerData);
      } catch (err) {
        console.error("Error loading partner data:", err);
        setError("Failed to load partner data");
      } finally {
        setLoading(false);
      }
    }

    loadPartnerData();
  }, [router]);

  function copyReferralLink() {
    if (!data) return;
    const url = `${window.location.origin}?ref=${data.partner.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="glass-card p-6 max-w-md text-center space-y-4">
          <p className="text-muted-foreground">{error || "Unable to load partner data"}</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { partner, stats, charts, referred_studios, payouts } = data;

  // Get top countries
  const topCountries = Object.entries(charts.visits_by_country)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statCards = [
    { label: "Total Clicks", value: stats.total_visits, subtext: `${stats.unique_visitors} unique`, icon: MousePointer, color: "from-blue-500 to-cyan-500" },
    { label: "Sign Ups", value: stats.total_signups, subtext: `${stats.conversion_rate}% conversion`, icon: UserPlus, color: "from-green-500 to-emerald-500" },
    { label: "Studios", value: stats.total_studios, subtext: "created by referrals", icon: Building2, color: "from-purple-500 to-pink-500" },
    { label: "Projects", value: stats.total_projects, subtext: "across all studios", icon: FolderKanban, color: "from-orange-500 to-yellow-500" },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Partner Dashboard</h1>
              <p className="text-sm text-muted-foreground">{partner.name}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${partner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
            {partner.is_active ? "Active" : "Inactive"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Referral Link */}
        <div className="glass-card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Your Referral Link</h3>
              <p className="text-xs text-muted-foreground">Share to earn {partner.commission_percent}% commission</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 px-4 py-3 rounded-lg text-sm break-all text-muted-foreground">
              {typeof window !== 'undefined' ? `${window.location.origin}?ref=${partner.code}` : `https://myblueprint.studio?ref=${partner.code}`}
            </code>
            <button 
              onClick={copyReferralLink} 
              className="px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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

        {/* Plans Breakdown & Earnings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Studios by Plan */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Studios by Plan</h3>
            </div>
            {Object.keys(stats.studios_by_plan).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.studios_by_plan).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className={`capitalize ${planColors[plan] || 'text-zinc-400'}`}>{plan}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                  {Object.entries(stats.studios_by_plan).map(([plan, count]) => (
                    <div 
                      key={plan}
                      className={`h-full bg-gradient-to-r ${planBgColors[plan] || 'from-zinc-500 to-zinc-600'}`}
                      style={{ width: `${stats.total_studios ? (count / stats.total_studios * 100) : 0}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No studios yet</p>
            )}
          </div>

          {/* Earnings */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Earnings</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="font-medium text-green-400">${(stats.total_earnings_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid Out</span>
                <span className="font-medium">${(stats.paid_out_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-yellow-400">${(stats.pending_payout_cents / 100).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Commission Rate</span>
                  <span className="font-medium">{partner.commission_percent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Countries & Payouts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Top Countries */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Top Countries</h3>
            </div>
            {topCountries.length > 0 ? (
              <div className="space-y-3">
                {topCountries.map(([country, count], index) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-4 text-sm">{index + 1}.</span>
                      <span>{country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / stats.total_visits) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </div>

          {/* Payout History */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Payout History</h3>
            </div>
            {payouts.length > 0 ? (
              <div className="space-y-3">
                {payouts.slice(0, 5).map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">${(payout.amount_cents / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.period_start), "MMM yyyy")}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      payout.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      payout.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {payout.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No payouts yet</p>
            )}
          </div>
        </div>

        {/* Referred Studios Table */}
        {referred_studios.length > 0 && (
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Referred Studios</h3>
                <p className="text-xs text-muted-foreground">Studios created by your referrals</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Projects</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {referred_studios.map((studio, index) => (
                    <tr key={studio.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-2">
                        <span className={`text-sm capitalize ${planColors[studio.plan] || 'text-zinc-400'}`}>
                          {studio.plan}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm">
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-3 h-3 text-muted-foreground" />
                          {studio.project_count}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {format(new Date(studio.created_at), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Partner Details */}
        <div className="glass-card p-4 md:p-5">
          <h3 className="font-semibold mb-4">Partner Details</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Commission Rate</p>
              <p className="font-medium">{partner.commission_percent}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Partner Since</p>
              <p className="font-medium">{format(new Date(partner.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Status</p>
              <p className={`font-medium ${partner.is_active ? 'text-green-400' : 'text-zinc-400'}`}>
                {partner.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>Questions about the partner program?</p>
          <Link href="/help/tickets/new?category=partnership" className="text-blue-400 hover:underline">
            Contact us
          </Link>
        </div>
      </main>
    </div>
  );
}
