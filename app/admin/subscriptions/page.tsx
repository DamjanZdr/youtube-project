"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Key
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Subscription {
  id: string;
  organization_id: string;
  plan: string;
  status: string;
  source: string | null;
  interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  organization?: { name: string; slug: string } | null;
}

const ITEMS_PER_PAGE = 20;

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-300",
  creator: "bg-blue-500/20 text-blue-300",
  studio: "bg-purple-500/20 text-purple-300",
  agency: "bg-orange-500/20 text-orange-300",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-300",
  past_due: "bg-red-500/20 text-red-300",
  canceled: "bg-zinc-500/20 text-zinc-300",
  trialing: "bg-blue-500/20 text-blue-300",
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    async function loadSubscriptions() {
      setLoading(true);
      const supabase = createClient();

      // Build query
      let countQuery = supabase.from("subscriptions").select("*", { count: "exact", head: true });
      let dataQuery = supabase
        .from("subscriptions")
        .select(`
          id,
          organization_id,
          plan,
          status,
          source,
          interval,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          stripe_subscription_id
        `)
        .order("created_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (planFilter !== "all") {
        countQuery = countQuery.eq("plan", planFilter);
        dataQuery = dataQuery.eq("plan", planFilter);
      }

      const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);

      setTotalCount(count || 0);

      if (data) {
        const orgIds = data.map(s => s.organization_id);
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, slug")
          .in("id", orgIds);

        let filteredData = data.map(sub => ({
          ...sub,
          organization: orgs?.find(o => o.id === sub.organization_id) || null,
        }));

        // Filter by search
        if (search) {
          filteredData = filteredData.filter(s => 
            s.organization?.name.toLowerCase().includes(search.toLowerCase()) ||
            s.organization?.slug.toLowerCase().includes(search.toLowerCase())
          );
        }

        setSubscriptions(filteredData);
      }

      setLoading(false);
    }

    loadSubscriptions();
  }, [page, search, planFilter]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all subscriptions
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by studio name..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "free", "creator", "studio", "enterprise"].map((plan) => (
            <button
              key={plan}
              onClick={() => {
                setPlanFilter(plan);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                planFilter === plan
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Studio</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Period</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{sub.organization?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">/{sub.organization?.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${planColors[sub.plan] || planColors.free}`}>
                      {sub.plan}
                    </span>
                    {sub.interval && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({sub.interval === "year" ? "yearly" : "monthly"})
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[sub.status] || statusColors.active}`}>
                      {sub.cancel_at_period_end ? "Canceling" : sub.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {sub.source === "key" ? (
                        <Key className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm capitalize">
                        {sub.source || (sub.plan === "free" ? "Free" : "Stripe")}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {sub.current_period_end ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Ends {format(new Date(sub.current_period_end), "MMM d, yyyy")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(sub.current_period_end), { addSuffix: true })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {sub.stripe_subscription_id && (
                      <a
                        href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/10 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Stripe
                      </a>
                    )}
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
          <p className="text-sm text-muted-foreground">
            Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
