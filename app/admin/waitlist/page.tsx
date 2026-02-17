"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Trash2,
  Users,
  CheckCircle,
  Clock,
  Copy,
  Check,
  Key,
  Send,
  Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
  discord_invite_sent: boolean;
  key_sent_at: string | null;
  notes: string | null;
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

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "invited" | "pending" | "key_sent" | "no_key">("all");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [copiedEmails, setCopiedEmails] = useState(false);

  // Send keys dialog state
  const [showSendKeys, setShowSendKeys] = useState(false);
  const [sendPlan, setSendPlan] = useState("creator");
  const [sendDuration, setSendDuration] = useState("month");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [page, filter, search]);

  async function fetchEntries() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("waitlist")
      .select("*", { count: "exact" });

    // Apply filters
    if (filter === "invited") {
      query = query.eq("discord_invite_sent", true);
    } else if (filter === "pending") {
      query = query.eq("discord_invite_sent", false);
    } else if (filter === "key_sent") {
      query = query.not("key_sent_at", "is", null);
    } else if (filter === "no_key") {
      query = query.is("key_sent_at", null);
    }

    // Apply search
    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

    // Pagination
    query = query
      .order("created_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching waitlist:", error);
      toast.error("Failed to load waitlist");
    } else {
      setEntries(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }

  async function deleteSelected() {
    if (selectedEntries.size === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("waitlist")
      .delete()
      .in("id", Array.from(selectedEntries));

    if (error) {
      toast.error("Failed to delete entries");
    } else {
      toast.success(`Deleted ${selectedEntries.size} entries`);
      setSelectedEntries(new Set());
      fetchEntries();
    }
  }

  async function markAsInvited() {
    if (selectedEntries.size === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("waitlist")
      .update({ discord_invite_sent: true })
      .in("id", Array.from(selectedEntries));

    if (error) {
      toast.error("Failed to update entries");
    } else {
      toast.success(`Marked ${selectedEntries.size} as invited`);
      setSelectedEntries(new Set());
      fetchEntries();
    }
  }

  function copyAllEmails() {
    const emails = entries.map(e => e.email).join("\n");
    navigator.clipboard.writeText(emails);
    setCopiedEmails(true);
    toast.success("Copied all emails to clipboard");
    setTimeout(() => setCopiedEmails(false), 2000);
  }

  function exportCSV() {
    const headers = ["email", "signed_up", "key_sent", "discord_invite_sent"];
    const rows = entries.map(e => [
      e.email,
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm"),
      e.key_sent_at ? format(new Date(e.key_sent_at), "yyyy-MM-dd HH:mm") : "",
      e.discord_invite_sent ? "Yes" : "No"
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported waitlist to CSV");
  }

  async function sendKeysToSelected() {
    if (selectedEntries.size === 0) return;

    setSending(true);

    // Get emails for selected entries
    const selectedEmails = entries
      .filter(e => selectedEntries.has(e.id))
      .map(e => e.email);

    try {
      const res = await fetch("/api/admin/send-waitlist-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: selectedEmails,
          plan: sendPlan,
          duration: sendDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send keys");
      } else {
        toast.success(`Sent ${data.summary.sent} keys successfully!`);
        if (data.summary.failed > 0) {
          toast.error(`${data.summary.failed} failed to send`);
        }
        setSelectedEntries(new Set());
        setShowSendKeys(false);
        fetchEntries(); // Refresh to show updated key_sent_at
      }
    } catch (error) {
      toast.error("Failed to send keys");
    } finally {
      setSending(false);
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const allSelected = entries.length > 0 && entries.every(e => selectedEntries.has(e.id));

  const stats = {
    total: totalCount,
    invited: entries.filter(e => e.discord_invite_sent).length,
    pending: entries.filter(e => !e.discord_invite_sent).length,
    keySent: entries.filter(e => e.key_sent_at).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-muted-foreground">Pre-launch signups for beta access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyAllEmails} className="gap-2">
            {copiedEmails ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Emails
          </Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Signups</p>
            </div>
          </div>
        </div>
        <div className="glass border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.invited}</p>
              <p className="text-sm text-muted-foreground">Invited</p>
            </div>
          </div>
        </div>
        <div className="glass border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.keySent}</p>
              <p className="text-sm text-muted-foreground">Keys Sent</p>
            </div>
          </div>
        </div>
        <div className="glass border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "no_key", "key_sent", "pending", "invited"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter(f); setPage(0); }}
              className="capitalize"
            >
              {f === "key_sent" ? "Key Sent" : f === "no_key" ? "No Key" : f}
            </Button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span className="text-sm">{selectedEntries.size} selected</span>
          <Button size="sm" onClick={() => setShowSendKeys(true)} className="gap-2">
            <Key className="w-4 h-4" />
            Send Keys
          </Button>
          <Button size="sm" variant="outline" onClick={markAsInvited} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Mark as Invited
          </Button>
          <Button size="sm" variant="outline" onClick={deleteSelected} className="gap-2 text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="glass border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntries(new Set(entries.map(e => e.id)));
                    } else {
                      setSelectedEntries(new Set());
                    }
                  }}
                  className="rounded border-white/20"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Signed Up</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Key Sent</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No waitlist entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedEntries.has(entry.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedEntries);
                        if (e.target.checked) {
                          newSelected.add(entry.id);
                        } else {
                          newSelected.delete(entry.id);
                        }
                        setSelectedEntries(newSelected);
                      }}
                      className="rounded border-white/20"
                    />
                  </td>
                  <td className="p-4">
                    <span className="font-medium">{entry.email}</span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="p-4">
                    {entry.key_sent_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                        <Key className="w-3 h-3" />
                        {formatDistanceToNow(new Date(entry.key_sent_at), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {entry.discord_invite_sent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Invited
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Send Keys Dialog */}
      <Dialog open={showSendKeys} onOpenChange={setShowSendKeys}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Send Keys to {selectedEntries.size} {selectedEntries.size === 1 ? "Person" : "People"}
            </DialogTitle>
            <DialogDescription>
              Generate and send plan keys to the selected waitlist entries via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Plan</label>
              <div className="flex gap-2">
                {planOptions.map((plan) => (
                  <button
                    key={plan.value}
                    onClick={() => setSendPlan(plan.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      sendPlan === plan.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {plan.label}
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
                    onClick={() => setSendDuration(dur.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      sendDuration === dur.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-muted-foreground">
                This will generate <strong className="text-white">{selectedEntries.size}</strong> unique{" "}
                <strong className="text-white">{planOptions.find(p => p.value === sendPlan)?.label}</strong> keys with{" "}
                <strong className="text-white">{durationOptions.find(d => d.value === sendDuration)?.label}</strong>{" "}
                duration and email them to each selected person.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendKeys(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={sendKeysToSelected} disabled={sending} className="gap-2">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Keys
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
