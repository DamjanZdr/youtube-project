"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search,
  Calendar,
  Users,
  FolderKanban,
  Crown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Key,
  Mail,
  Loader2,
  Check,
  Copy,
  Link
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
  enterprise: "bg-orange-500/20 text-orange-300",
};

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Send Key Dialog
  const [sendKeyOpen, setSendKeyOpen] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [keyPlan, setKeyPlan] = useState("creator");
  const [keyDuration, setKeyDuration] = useState("year");
  const [sending, setSending] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; redeemUrl: string } | null>(null);

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

  const handleSendKey = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/admin/send-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedStudio?.owner?.email || null,
          plan: keyPlan,
          duration: keyDuration,
          orgId: selectedStudio?.id,
          orgName: selectedStudio?.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create key");
      }

      setGeneratedKey({ key: result.key, redeemUrl: result.redeemUrl });
      toast.success("Key generated! Copy it below.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create key";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const openSendKeyDialog = (studio: Studio) => {
    setSelectedStudio(studio);
    setKeyPlan("creator");
    setKeyDuration("year");
    setGeneratedKey(null);
    setSendKeyOpen(true);
  };

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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSendKeyDialog(studio)}
                          title="Send Plan Key"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/studio/${studio.slug}`, "_blank")}
                          title="Open Studio"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Send Key Dialog */}
      <Dialog open={sendKeyOpen} onOpenChange={setSendKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatedKey ? "Key Generated!" : "Generate Plan Key"}
            </DialogTitle>
            <DialogDescription>
              {generatedKey 
                ? "Copy the key or link below and share it with the recipient."
                : `Generate a plan key for ${selectedStudio?.name}`
              }
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4 py-4">
              {/* Generated Key Display */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
                <p className="text-xs text-muted-foreground mb-2">Plan Key</p>
                <div className="flex items-center justify-between">
                  <code className="text-xl font-bold font-mono tracking-wider">
                    {generatedKey.key}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedKey.key, "Key")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Redemption Link */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Redemption Link</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate">
                    {generatedKey.redeemUrl}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedKey.redeemUrl, "Link")}
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-200">
                  <strong>Plan:</strong> {keyPlan.charAt(0).toUpperCase() + keyPlan.slice(1)} • 
                  <strong> Duration:</strong> {keyDuration === "month" ? "1 Month" : keyDuration === "year" ? "1 Year" : "Lifetime"} • 
                  <strong> Locked to:</strong> {selectedStudio?.name}
                </p>
              </div>

              <Button className="w-full" onClick={() => setSendKeyOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{selectedStudio?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" />
                    {selectedStudio?.owner?.email || "No owner email"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={keyPlan} onValueChange={setKeyPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creator">Creator</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={keyDuration} onValueChange={setKeyDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">1 Month</SelectItem>
                      <SelectItem value="year">1 Year</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-200">
                    <strong>Note:</strong> This key will be locked to this organization. 
                    Share the key manually via email, Discord, etc.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendKeyOpen(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={handleSendKey} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate Key
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
