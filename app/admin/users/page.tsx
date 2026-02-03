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
  Mail,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Key,
  Loader2,
  Copy,
  Link
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  organizations: { name: string; slug: string }[];
}

const ITEMS_PER_PAGE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Send Key Dialog
  const [sendKeyOpen, setSendKeyOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [keyPlan, setKeyPlan] = useState("creator");
  const [keyDuration, setKeyDuration] = useState("year");
  const [sending, setSending] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; redeemUrl: string } | null>(null);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const supabase = createClient();

      // Get total count
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setTotalCount(count || 0);

      // Get users with their organizations
      let query = supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          created_at
        `)
        .order("created_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data: profiles } = await query;

      if (profiles) {
        // Get organizations for each user
        const userIds = profiles.map(p => p.id);
        const { data: memberships } = await supabase
          .from("organization_members")
          .select(`
            user_id,
            organizations:organization_id (name, slug)
          `)
          .in("user_id", userIds);

        const usersWithOrgs = profiles.map(profile => ({
          ...profile,
          organizations: memberships
            ?.filter(m => m.user_id === profile.id)
            .map(m => m.organizations as any)
            .filter(Boolean) || [],
        }));

        setUsers(usersWithOrgs);
      }

      setLoading(false);
    }

    loadUsers();
  }, [page, search]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSendKey = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/admin/send-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUser?.email || null,
          plan: keyPlan,
          duration: keyDuration,
          // No orgId - user can use on any org
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

  const openSendKeyDialog = (user: User) => {
    setSelectedUser(user);
    setKeyPlan("creator");
    setKeyDuration("year");
    setGeneratedKey(null);
    setSendKeyOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          {totalCount.toLocaleString()} total users
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
          placeholder="Search by email or name..."
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Studios</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-medium">
                            {(user.full_name || user.email)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {user.organizations.length > 0 ? (
                        user.organizations.map((org, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-xs"
                          >
                            <Building2 className="w-3 h-3" />
                            {org.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSendKeyDialog(user)}
                      title="Send Plan Key"
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
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
                : `Generate a plan key for ${selectedUser?.full_name || selectedUser?.email}`
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
                  <strong> For:</strong> Any studio
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
                  <p className="text-sm font-medium">{selectedUser?.full_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" />
                    {selectedUser?.email}
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

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-200">
                    <strong>Note:</strong> This key is <em>not</em> locked to any organization. 
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
