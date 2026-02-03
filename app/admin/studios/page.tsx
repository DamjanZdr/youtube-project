"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Calendar,
  Users,
  FolderKanban,
  Crown,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Studio {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
  } | null;
  member_count: number;
  project_count: number;
}

const ITEMS_PER_PAGE = 20;

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-300",
  creator: "bg-blue-500/20 text-blue-300",
  studio: "bg-purple-500/20 text-purple-300",
  agency: "bg-orange-500/20 text-orange-300",
};

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadStudios() {
      setLoading(true);
      const supabase = createClient();

      // Get total count
      const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      setTotalCount(count || 0);

      // Get studios
      let query = supabase
        .from("organizations")
        .select(`
          id,
          name,
          slug,
          created_at,
          owner_id
        `)
        .order("created_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }

      const { data: orgs } = await query;

      if (orgs) {
        const orgIds = orgs.map(o => o.id);
        const ownerIds = orgs.map(o => o.owner_id).filter(Boolean);

        // Get additional data in parallel
        const [
          { data: owners },
          { data: subscriptions },
          { data: members },
          { data: projects },
        ] = await Promise.all([
          supabase.from("profiles").select("id, email, full_name").in("id", ownerIds),
          supabase.from("subscriptions").select("organization_id, plan, status").in("organization_id", orgIds),
          supabase.from("organization_members").select("organization_id").in("organization_id", orgIds),
          supabase.from("projects").select("organization_id").in("organization_id", orgIds),
        ]);

        const studiosWithData = orgs.map(org => ({
          ...org,
          owner: owners?.find(o => o.id === org.owner_id) || null,
          subscription: subscriptions?.find(s => s.organization_id === org.id) || null,
          member_count: members?.filter(m => m.organization_id === org.id).length || 0,
          project_count: projects?.filter(p => p.organization_id === org.id).length || 0,
        }));

        setStudios(studiosWithData);
      }

      setLoading(false);
    }

    loadStudios();
  }, [page, search]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Studios</h1>
        <p className="text-muted-foreground mt-1">
          {totalCount.toLocaleString()} total studios (organizations)
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name or slug..."
          className="pl-10"
        />
      </div>

      {/* Studios Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Studio</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owner</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Members</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Projects</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : studios.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No studios found
                </td>
              </tr>
            ) : (
              studios.map((studio) => {
                const plan = studio.subscription?.plan || "free";
                return (
                  <tr key={studio.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{studio.name}</p>
                        <p className="text-xs text-muted-foreground">/{studio.slug}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      {studio.owner ? (
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <div>
                            <p className="text-sm">{studio.owner.full_name || "No name"}</p>
                            <p className="text-xs text-muted-foreground">{studio.owner.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${planColors[plan] || planColors.free}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{studio.member_count}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FolderKanban className="w-4 h-4" />
                        <span>{studio.project_count}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(studio.created_at), { addSuffix: true })}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/studio/${studio.slug}`, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
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
