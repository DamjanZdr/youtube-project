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
  Ban,
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
  deactivated_at: string | null;
  redeemed_org?: { name: string } | null;
  assigned_org?: { name: string } | null;
  redeemed_user?: { email: string } | null;
  is_active?: boolean; // Whether this key is the org's current active subscription
}

type KeyStatus = "available" | "sent" | "active" | "expired" | "deactivated";

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
  const [filter, setFilter] = useState<"all" | "available" | "sent" | "active" | "expired" | "deactivated">("all");

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Generate dialog state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlan, setGenPlan] = useState("creator");
  const [genDuration, setGenDuration] = useState("month");
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Deactivate confirmation dialog (bulk)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Single key deactivate dialog
  const [singleDeactivateKey, setSingleDeactivateKey] = useState<PlanKey | null>(null);

  // Send email dialog
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendEmailKey, setSendEmailKey] = useState<PlanKey | null>(null);
  const [sendToEmail, setSendToEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Helper to get key status
  const getKeyStatus = (key: PlanKey): KeyStatus => {
    if (key.deactivated_at) return "deactivated";
    if (!key.redeemed_at) {
      if (key.sent_to_email || key.assigned_org_id) return "sent";
      return "available";
    }
    // Redeemed - check if active or expired
    return key.is_active ? "active" : "expired";
  };

  // Get status breakdown for selected keys
  const getSelectedStatusBreakdown = () => {
    const breakdown = { available: 0, sent: 0, active: 0, expired: 0, deactivated: 0 };
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
        expires_at,
        deactivated_at
      `)
      .order("created_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    // Filter logic - active/expired need to be filtered client-side after checking subscriptions
    if (filter === "deactivated") {
      countQuery = countQuery.not("deactivated_at", "is", null);
      dataQuery = dataQuery.not("deactivated_at", "is", null);
    } else if (filter === "available") {
      countQuery = countQuery.is("deactivated_at", null).is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
      dataQuery = dataQuery.is("deactivated_at", null).is("redeemed_at", null).is("sent_to_email", null).is("assigned_org_id", null);
    } else if (filter === "sent") {
      countQuery = countQuery.is("deactivated_at", null).is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
      dataQuery = dataQuery.is("deactivated_at", null).is("redeemed_at", null).or("sent_to_email.not.is.null,assigned_org_id.not.is.null");
    } else if (filter === "active" || filter === "expired") {
      // For active/expired, we need redeemed keys that are not deactivated
      countQuery = countQuery.is("deactivated_at", null).not("redeemed_at", "is", null);
      dataQuery = dataQuery.is("deactivated_at", null).not("redeemed_at", "is", null);
    }
    // "all" filter shows everything

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

      // Also get subscription info to determine if key is active
      const [{ data: orgs }, { data: users }, { data: subscriptions }] = await Promise.all([
        allOrgIds.length > 0 
          ? supabase.from("organizations").select("id, name").in("id", allOrgIds)
          : { data: [] },
        userIds.length > 0 
          ? supabase.from("profiles").select("id, email").in("id", userIds)
          : { data: [] },
        redeemedOrgIds.length > 0
          ? supabase.from("subscriptions").select("organization_id, plan, source, status").in("organization_id", redeemedOrgIds)
          : { data: [] },
      ]);

      // Build a map of org_id -> active subscription info
      const orgSubscriptions = new Map<string, { plan: string; source: string; status: string }>();
      subscriptions?.forEach(sub => {
        orgSubscriptions.set(sub.organization_id, { plan: sub.plan, source: sub.source, status: sub.status });
      });

      let mappedKeys = data.map(key => {
        // A key is "active" if:
        // 1. It's redeemed to an org
        // 2. That org's current subscription source is 'key' AND plan matches
        let isActive = false;
        if (key.redeemed_org_id && key.redeemed_at) {
          const sub = orgSubscriptions.get(key.redeemed_org_id);
          if (sub && sub.source === "key" && sub.plan === key.plan && sub.status === "active") {
            isActive = true;
          }
        }
        
        return {
          ...key,
          redeemed_org: orgs?.find(o => o.id === key.redeemed_org_id) || null,
          assigned_org: orgs?.find(o => o.id === key.assigned_org_id) || null,
          redeemed_user: users?.find(u => u.id === key.redeemed_by) || null,
          is_active: isActive,
        };
      });

      // Client-side filter for active/expired
      if (filter === "active") {
        mappedKeys = mappedKeys.filter(k => k.redeemed_at && k.is_active);
      } else if (filter === "expired") {
        mappedKeys = mappedKeys.filter(k => k.redeemed_at && !k.is_active);
      }

      setKeys(mappedKeys);
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

  async function handleDeactivateKey(keyId: string) {
    const keyToDeactivate = keys.find(k => k.id === keyId);
    if (!keyToDeactivate) return;
    
    const status = getKeyStatus(keyToDeactivate);
    
    if (status === "deactivated") {
      toast.error("Key is already deactivated");
      return;
    }
    
    // Show confirmation dialog
    setSingleDeactivateKey(keyToDeactivate);
  }

  async function confirmSingleDeactivate() {
    if (!singleDeactivateKey) return;

    setDeactivating(true);

    try {
      const response = await fetch("/api/admin/delete-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyIds: [singleDeactivateKey.id] }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || "Failed to deactivate key");
      } else {
        if (result.revoked > 0) {
          toast.success("Key deactivated, subscription revoked");
        } else {
          toast.success("Key deactivated");
        }
      }
    } catch (err) {
      toast.error("Failed to deactivate key");
    }
    
    setSingleDeactivateKey(null);
    setDeactivating(false);
    loadKeys();
  }

  async function handleBulkDeactivate() {
    if (selectedKeys.size === 0) return;
    
    setDeactivating(true);
    
    try {
      const response = await fetch("/api/admin/delete-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyIds: Array.from(selectedKeys) }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || "Failed to deactivate keys");
      } else {
        if (result.revoked > 0) {
          toast.success(`Deactivated ${result.deactivated} key(s), revoked ${result.revoked} subscription(s)`);
        } else {
          toast.success(`Deactivated ${result.deactivated} key(s)`);
        }
      }
    } catch (err) {
      toast.error("Failed to deactivate keys");
    }
    
    setDeactivating(false);
    setShowDeactivateConfirm(false);
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
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "deactivated", label: "Deactivated" },
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
              onClick={() => setShowDeactivateConfirm(true)}
              className="gap-2"
            >
              <Ban className="w-4 h-4" />
              Deactivate Selected
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
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sent To / Redeemed By</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Activated</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
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
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.duration === "month" ? "Monthly" : key.duration === "year" ? "Yearly" : "Lifetime"}
                      </span>
                    </td>
                    <td className="p-4">
                      {status === "deactivated" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 flex items-center gap-1 w-fit">
                          <Ban className="w-3 h-3" />
                          Deactivated
                        </span>
                      ) : status === "active" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                          Active
                        </span>
                      ) : status === "expired" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-500/20 text-zinc-400">
                          Expired
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
                      {(status === "active" || status === "expired" || status === "deactivated") && key.redeemed_org ? (
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
                      {key.redeemed_at ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>{formatDistanceToNow(new Date(key.redeemed_at), { addSuffix: true })}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                        {status !== "deactivated" && (
                          <button
                            onClick={() => handleDeactivateKey(key.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Deactivate key"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
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

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Deactivate {selectedKeys.size} Key(s)
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate the selected keys? They will remain in the system but cannot be used.
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
                  {breakdown.active > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Active
                      </span>
                      <span className="text-muted-foreground">{breakdown.active}</span>
                    </div>
                  )}
                  {breakdown.expired > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        Expired
                      </span>
                      <span className="text-muted-foreground">{breakdown.expired}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {getSelectedStatusBreakdown().active > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warning: {getSelectedStatusBreakdown().active} key(s) are currently active.
                  Deactivating them will revoke the subscription and downgrade to Free.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeactivateConfirm(false)} 
              className="flex-1"
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDeactivate} 
              className="flex-1 gap-2"
              disabled={deactivating}
            >
              {deactivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Deactivate {selectedKeys.size} Key(s)
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

      {/* Single Key Deactivate Dialog */}
      <Dialog open={!!singleDeactivateKey} onOpenChange={(open) => !open && setSingleDeactivateKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Deactivate Key
            </DialogTitle>
            <DialogDescription>
              {singleDeactivateKey && getKeyStatus(singleDeactivateKey) === "active"
                ? "This key is currently active. Deactivating it will revoke the subscription and downgrade to Free."
                : "Are you sure you want to deactivate this key? It will no longer be usable."}
            </DialogDescription>
          </DialogHeader>

          {singleDeactivateKey && (
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Key</span>
                <code className="font-mono text-sm">{singleDeactivateKey.key}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="capitalize">{singleDeactivateKey.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="capitalize">{getKeyStatus(singleDeactivateKey)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSingleDeactivateKey(null)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSingleDeactivate}
              disabled={deactivating}
              className="gap-2"
            >
              {deactivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
