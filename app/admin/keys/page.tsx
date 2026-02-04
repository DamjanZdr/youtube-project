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
  Download,
  Mail,
  Send,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
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
  assigned_org_id: string | null;
  sent_to_email: string | null;
  sent_at: string | null;
  expires_at: string | null;
  redeemed_org?: { name: string } | null;
  assigned_org?: { name: string } | null;
  redeemed_user?: { email: string } | null;
}

type KeyStatus = "available" | "sent" | "used";

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
  const [filter, setFilter] = useState<"all" | "available" | "sent" | "used">("all");

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Generate dialog state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlan, setGenPlan] = useState("creator");
  const [genDuration, setGenDuration] = useState("year");
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete/Cancel confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Send email dialog
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendEmailKey, setSendEmailKey] = useState<PlanKey | null>(null);
  const [sendToEmail, setSendToEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Helper to get key status
  const getKeyStatus = (key: PlanKey): KeyStatus => {
    if (key.redeemed_at) return "used";
    if (key.sent_to_email || key.assigned_org_id) return "sent";
    return "available";
  };

  // Get status breakdown for selected keys
  const getSelectedStatusBreakdown = () => {
    const breakdown = { available: 0, sent: 0, used: 0 };
    keys.forEach(key => {
      if (selectedKeys.has(key.id)) {
        breakdown[getKeyStatus(key)]++;
      }
    });
    return breakdown;
  };

  useEffect(() => {
    loadKeys();
  }, [page, search, filter]);

  // Clear selection when changing pages/filters
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [page, filter, search]);

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
        assigned_org_id,
        sent_to_email,
        sent_at,
        expires_at
      `)
      .order("created_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    // Filter logic
    if (filter === "available") {
      countQuery = countQuery.is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
      dataQuery = dataQuery.is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
    } else if (filter === "sent") {
      countQuery = countQuery.is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
      dataQuery = dataQuery.is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
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
      // Get org and user info for redeemed/assigned keys
      const redeemedOrgIds = data.filter(k => k.redeemed_org_id).map(k => k.redeemed_org_id!);
      const assignedOrgIds = data.filter(k => k.assigned_org_id).map(k => k.assigned_org_id!);
      const allOrgIds = [...new Set([...redeemedOrgIds, ...assignedOrgIds])];
      const userIds = data.filter(k => k.redeemed_by).map(k => k.redeemed_by!);

      const [{ data: orgs }, { data: users }] = await Promise.all([
        allOrgIds.length > 0 
          ? supabase.from("organizations").select("id, name").in("id", allOrgIds)
          : { data: [] },
        userIds.length > 0 
          ? supabase.from("profiles").select("id, email").in("id", userIds)
          : { data: [] },
      ]);

      setKeys(data.map(key => ({
        ...key,
        redeemed_org: orgs?.find(o => o.id === key.redeemed_org_id) || null,
        assigned_org: orgs?.find(o => o.id === key.assigned_org_id) || null,
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

  async function handleBulkDelete() {
    if (selectedKeys.size === 0) return;
    
    setDeleting(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from("plan_keys")
      .delete()
      .in("id", Array.from(selectedKeys));
    
    if (error) {
      toast.error("Failed to delete some keys");
    } else {
      toast.success(`Deleted ${selectedKeys.size} key(s)`);
    }
    
    setDeleting(false);
    setShowDeleteConfirm(false);
    setSelectedKeys(new Set());
    loadKeys();
  }

  async function handleSendEmail() {
    if (!sendEmailKey || !sendToEmail.trim()) return;
    
    setSending(true);
    
    try {
      const response = await fetch("/api/admin/send-key-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: sendEmailKey.id,
          email: sendToEmail.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || "Failed to send email");
      } else {
        toast.success(`Key sent to ${sendToEmail}`);
        setShowSendEmail(false);
        setSendEmailKey(null);
        setSendToEmail("");
        loadKeys();
      }
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  }

  function toggleSelectKey(keyId: string) {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(keyId)) {
      newSelected.delete(keyId);
    } else {
      newSelected.add(keyId);
    }
    setSelectedKeys(newSelected);
  }

  function toggleSelectAll() {
    if (selectedKeys.size === keys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(keys.map(k => k.id)));
    }
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
          {([
            { value: "all", label: "All" },
            { value: "available", label: "Available" },
            { value: "sent", label: "Sent" },
            { value: "used", label: "Used" },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.value
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        {/* Bulk Actions */}
        {selectedKeys.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedKeys.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 w-12">
                <input
                  type="checkbox"
                  checked={keys.length > 0 && selectedKeys.size === keys.length}
                  onChange={toggleSelectAll}
                  className="rounded border-white/20 bg-white/5"
                />
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Key</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sent To / Redeemed By</th>
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
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No keys found
                </td>
              </tr>
            ) : (
              keys.map((key) => {
                const planInfo = planOptions.find(p => p.value === key.plan);
                const status = getKeyStatus(key);
                return (
                  <tr key={key.id} className={`border-b border-white/5 hover:bg-white/5 ${selectedKeys.has(key.id) ? "bg-white/5" : ""}`}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(key.id)}
                        onChange={() => toggleSelectKey(key.id)}
                        className="rounded border-white/20 bg-white/5"
                      />
                    </td>
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
                      {status === "used" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                          Used
                        </span>
                      ) : status === "sent" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 flex items-center gap-1 w-fit">
                          <Send className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {status === "used" && key.redeemed_org ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{key.redeemed_org.name}</p>
                            <p className="text-xs text-muted-foreground">{key.redeemed_user?.email}</p>
                          </div>
                        </div>
                      ) : status === "sent" ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <div>
                            {key.sent_to_email && (
                              <p className="text-sm">{key.sent_to_email}</p>
                            )}
                            {key.assigned_org && (
                              <p className="text-sm">{key.assigned_org.name}</p>
                            )}
                            {key.sent_at && (
                              <p className="text-xs text-muted-foreground">
                                Sent {formatDistanceToNow(new Date(key.sent_at), { addSuffix: true })}
                              </p>
                            )}
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
                      <div className="flex items-center gap-1">
                        {status === "available" && (
                          <button
                            onClick={() => {
                              setSendEmailKey(key);
                              setShowSendEmail(true);
                            }}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-muted-foreground hover:text-blue-400 transition-colors"
                            title="Send to email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Delete {selectedKeys.size} Key(s)
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected keys? This action cannot be undone.
          </DialogDescription>

          <div className="mt-4 space-y-3">
            {/* Status breakdown */}
            {(() => {
              const breakdown = getSelectedStatusBreakdown();
              return (
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium mb-2">Status Breakdown:</p>
                  {breakdown.available > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        Available
                      </span>
                      <span className="text-muted-foreground">{breakdown.available}</span>
                    </div>
                  )}
                  {breakdown.sent > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Sent
                      </span>
                      <span className="text-muted-foreground">{breakdown.sent}</span>
                    </div>
                  )}
                  {breakdown.used > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Used
                      </span>
                      <span className="text-muted-foreground">{breakdown.used}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {getSelectedStatusBreakdown().used > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warning: {getSelectedStatusBreakdown().used} key(s) have already been redeemed.
                  Deleting them will not revoke the subscription.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)} 
              className="flex-1"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              className="flex-1 gap-2"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedKeys.size} Key(s)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showSendEmail} onOpenChange={(open) => {
        setShowSendEmail(open);
        if (!open) {
          setSendEmailKey(null);
          setSendToEmail("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Send Key to Email
          </DialogTitle>
          <DialogDescription>
            Send this key to an email address. They will receive instructions on how to redeem it.
          </DialogDescription>

          {sendEmailKey && (
            <div className="mt-4 space-y-4">
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Key</span>
                  <code className="font-mono text-sm">{sendEmailKey.key}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="capitalize">{sendEmailKey.plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="capitalize">{sendEmailKey.duration}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Email</label>
                <Input
                  type="email"
                  value={sendToEmail}
                  onChange={(e) => setSendToEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSendEmail(false);
                    setSendEmailKey(null);
                    setSendToEmail("");
                  }} 
                  className="flex-1"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  className="flex-1 gap-2"
                  disabled={sending || !sendToEmail.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
