"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Copy,
  MousePointer,
  UserPlus,
  Building2,
  DollarSign,
  TrendingUp,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Globe,
  Calendar,
  Percent,
  FolderKanban,
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
  free: "bg-zinc-500/20 text-zinc-300",
  creator: "bg-blue-500/20 text-blue-300",
  studio: "bg-purple-500/20 text-purple-300",
  enterprise: "bg-orange-500/20 text-orange-300",
};

export default function PartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PartnerData | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    toast.success("Referral link copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">{error || "Unable to load partner data"}</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { partner, stats, charts, referred_studios, payouts } = data;

  // Get top countries
  const topCountries = Object.entries(charts.visits_by_country)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
          <Badge variant={partner.is_active ? "default" : "secondary"}>
            {partner.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Referral Link Card */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link to earn {partner.commission_percent}% commission on paid subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 px-4 py-3 rounded-lg text-sm break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}?ref=${partner.code}` : `https://useblueprint.dev?ref=${partner.code}`}
              </code>
              <Button onClick={copyReferralLink} className="shrink-0">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                Total Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_visits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.unique_visitors.toLocaleString()} unique visitors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Sign Ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_signups.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.conversion_rate}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Studios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_studios.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                created by referrals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total_projects.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                across all studios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{partner.commission_percent}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                of first payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plans Breakdown */}
        {Object.keys(stats.studios_by_plan).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Studios by Plan
              </CardTitle>
              <CardDescription>
                Distribution of referred studios across subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.studios_by_plan).map(([plan, count]) => (
                  <div key={plan} className={`p-4 rounded-lg ${planColors[plan] || 'bg-zinc-500/20 text-zinc-300'}`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm capitalize">{plan}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings Section */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">
                  ${(stats.total_earnings_cents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Earned</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  ${(stats.paid_out_cents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Paid Out</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  ${(stats.pending_payout_cents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pending Payout</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Countries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCountries.length > 0 ? (
                <div className="space-y-3">
                  {topCountries.map(([country, count], index) => (
                    <div key={country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-4">{index + 1}.</span>
                        <span>{country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(count / stats.total_visits) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Payout History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="font-medium">${(payout.amount_cents / 100).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payout.period_start), "MMM yyyy")}
                        </p>
                      </div>
                      <Badge variant={
                        payout.status === 'paid' ? 'default' : 
                        payout.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {payout.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No payouts yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referred Studios Table */}
        {referred_studios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Referred Studios
              </CardTitle>
              <CardDescription>
                Studios created by users who signed up through your referral link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Studio #</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Projects</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referred_studios.map((studio, index) => (
                      <tr key={studio.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-sm">{index + 1}</td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${planColors[studio.plan] || 'bg-zinc-500/20 text-zinc-300'}`}
                          >
                            {studio.plan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3 text-muted-foreground" />
                            {studio.project_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {format(new Date(studio.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Partner Info */}
        <Card>
          <CardHeader>
            <CardTitle>Partner Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Partner Code</p>
                <p className="font-medium">{partner.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Commission Rate</p>
                <p className="font-medium">{partner.commission_percent}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Partner Since</p>
                <p className="font-medium">{format(new Date(partner.created_at), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={partner.is_active ? "default" : "secondary"}>
                  {partner.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-white/5">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Questions about the partner program?
              </p>
              <a href="mailto:partners@myblueprint.run" className="text-blue-400 hover:underline">
                Contact us at partners@myblueprint.run
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
