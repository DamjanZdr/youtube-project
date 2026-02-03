"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Calendar,
  Plus,
  Copy,
  Check,
  Key,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Building2,
  Download
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface PlanKey {
  id: string;
  key: string;
  plan: string;
  duration: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  redeemed_org_id: string | null;
  expires_at: string | null;
  redeemed_org?: { name: string } | null;
  redeemed_user?: { email: string } | null;
}

const ITEMS_PER_PAGE = 20;

const planOptions = [
  { value: "creator", label: "Creator", color: "bg-blue-500/20 text-blue-300" },
  { value: "studio", label: "Studio", color: "bg-purple-500/20 text-purple-300" },
  { value: "enterprise", label: "Enterprise", color: "bg-orange-500/20 text-orange-300" },
];

const durationOptions = [
  { value: "month", label: "1 Month" },
  { value: "year", label: "1 Year" },
  { value: "lifetime", label: "Lifetime" },
];

function generateKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like O/0, I/1
  const segments = 4;
  const segmentLength = 4;
  const parts: string[] = [];
  
  for (let s = 0; s < segments; s++) {
    let segment = "";
    for (let i = 0; i < segmentLength; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(segment);
  }
  
  return parts.join("-");
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<PlanKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");

  // Generate dialog state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlan, setGenPlan] = useState("creator");
  const [genDuration, setGenDuration] = useState("year");
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, [page, search, filter]);

  async function loadKeys() {
    setLoading(true);
    const supabase = createClient();

    // Build query
    let countQuery = supabase.from("plan_keys").select("*", { count: "exact", head: true });
    let dataQuery = supabase
      .from("plan_keys")
      .select(`
        id,
        key,
        plan,
        duration,
        created_at,
        redeemed_at,
        redeemed_by,
        redeemed_org_id,
        expires_at
      `)
      .order("created_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (filter === "unused") {
      countQuery = countQuery.is("redeemed_at", null);
      dataQuery = dataQuery.is("redeemed_at", null);
    } else if (filter === "used") {
      countQuery = countQuery.not("redeemed_at", "is", null);
      dataQuery = dataQuery.not("redeemed_at", "is", null);
    }

    if (search) {
      dataQuery = dataQuery.ilike("key", `%${search}%`);
    }

    const [{ count }, { data }] = await Promise.all([countQuery, dataQuery]);

    setTotalCount(count || 0);

    if (data) {
      // Get org and user info for redeemed keys
      const orgIds = data.filter(k => k.redeemed_org_id).map(k => k.redeemed_org_id!);
      const userIds = data.filter(k => k.redeemed_by).map(k => k.redeemed_by!);

      const [{ data: orgs }, { data: users }] = await Promise.all([
        orgIds.length > 0 
          ? supabase.from("organizations").select("id, name").in("id", orgIds)
          : { data: [] },
        userIds.length > 0 
          ? supabase.from("profiles").select("id, email").in("id", userIds)
          : { data: [] },
      ]);

      setKeys(data.map(key => ({
        ...key,
        redeemed_org: orgs?.find(o => o.id === key.redeemed_org_id) || null,
        redeemed_user: users?.find(u => u.id === key.redeemed_by) || null,
      })));
    }

    setLoading(false);
  }

  async function handleGenerateKeys() {
    setGenerating(true);
    const supabase = createClient();

    const newKeys: string[] = [];
    for (let i = 0; i < genCount; i++) {
      newKeys.push(generateKey());
    }

    // Insert keys
    const { error } = await supabase.from("plan_keys").insert(
      newKeys.map(key => ({
        key,
        plan: genPlan,
        duration: genDuration,
      }))
    );

    if (error) {
      console.error("Insert error:", error);
      toast.error("Failed to generate keys");
    } else {
      setGeneratedKeys(newKeys);
      toast.success(`Generated ${newKeys.length} key(s)`);
      loadKeys();
    }

    setGenerating(false);
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm("Are you sure you want to delete this key?")) return;

    const supabase = createClient();
    await supabase.from("plan_keys").delete().eq("id", keyId);
    
    toast.success("Key deleted");
    loadKeys();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function copyAllKeys() {
    navigator.clipboard.writeText(generatedKeys.join("\n"));
    toast.success("All keys copied to clipboard");
  }

  function downloadKeys() {
    const content = generatedKeys.map(k => `${k},${genPlan},${genDuration}`).join("\n");
    const blob = new Blob([`Key,Plan,Duration\n${content}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keys-${genPlan}-${genDuration}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Redemption Keys</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage subscription keys
          </p>
        </div>
        <Button onClick={() => {
          setGeneratedKeys([]);
          setShowGenerate(true);
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Keys
        </Button>
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
            placeholder="Search keys..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "unused", "used"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Keys Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Key</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Redeemed By</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
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
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No keys found
                </td>
              </tr>
            ) : (
              keys.map((key) => {
                const planInfo = planOptions.find(p => p.value === key.plan);
                const isUsed = !!key.redeemed_at;
                return (
                  <tr key={key.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <code className="font-mono text-sm">{key.key}</code>
                        <button
                          onClick={() => copyKey(key.key)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          {copiedKey === key.key ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${planInfo?.color || "bg-zinc-500/20"}`}>
                        {key.plan}
                      </span>
                    </td>
                    <td className="p-4">
                      {isUsed ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                          Used
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isUsed && key.redeemed_org ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{key.redeemed_org.name}</p>
                            <p className="text-xs text-muted-foreground">{key.redeemed_user?.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {!isUsed && (
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-md">
          <DialogTitle>Generate Keys</DialogTitle>
          <DialogDescription>
            Create new redemption keys for subscription plans
          </DialogDescription>

          {generatedKeys.length > 0 ? (
            <div className="space-y-4 mt-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-400 font-medium mb-3">
                  ✓ Generated {generatedKeys.length} key(s)
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {generatedKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm bg-black/30 px-2 py-1 rounded">
                        {key}
                      </code>
                      <button
                        onClick={() => copyKey(key)}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {copiedKey === key ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={copyAllKeys} className="flex-1 gap-2">
                  <Copy className="w-4 h-4" />
                  Copy All
                </Button>
                <Button variant="outline" onClick={downloadKeys} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>

              <Button onClick={() => setShowGenerate(false)} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Plan Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Plan</label>
                <div className="flex gap-2">
                  {planOptions.map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => setGenPlan(plan.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                        genPlan === plan.value
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className={`text-sm font-medium ${genPlan === plan.value ? "text-white" : "text-muted-foreground"}`}>
                        {plan.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <div className="flex gap-2">
                  {durationOptions.map((dur) => (
                    <button
                      key={dur.value}
                      onClick={() => setGenDuration(dur.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                        genDuration === dur.value
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className={`text-sm font-medium ${genDuration === dur.value ? "text-white" : "text-muted-foreground"}`}>
                        {dur.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Keys</label>
                <Input
                  type="number"
                  value={genCount}
                  onChange={(e) => setGenCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={100}
                />
                <p className="text-xs text-muted-foreground mt-1">Max 100 keys at once</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowGenerate(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleGenerateKeys} disabled={generating} className="flex-1">
                  {generating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
