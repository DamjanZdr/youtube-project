"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Link,
  Clock,
  DollarSign,
  History,
  User as UserIcon,
  Gift,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string | null;
  organizations: { id: string; name: string; slug: string }[];
}

interface BillingEvent {
  id: string;
  organization_id: string;
  event_type: string;
  previous_plan: string | null;
  new_plan: string | null;
  amount_cents: number | null;
  source: string;
  created_at: string;
  organization?: { name: string; slug: string };
}

interface OrgWithBilling {
  id: string;
  name: string;
  slug: string;
  plan: string;
  source: string | null;
  total_paid_cents: number;
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
  const [keyDuration, setKeyDuration] = useState("month");
  const [sending, setSending] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; redeemUrl: string } | null>(null);

  // User Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingEvent[]>([]);
  const [ownedOrgs, setOwnedOrgs] = useState<OrgWithBilling[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
          search,
        });
        
        const response = await fetch(`/api/admin/users?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        
        const { users: usersWithOrgs, totalCount: count } = await response.json();
        setUsers(usersWithOrgs);
        setTotalCount(count);
      } catch (error) {
        console.error("Failed to load users:", error);
      }

      setLoading(false);
    }

    loadUsers();
  }, [page, search]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Load user details with billing history
  const loadUserDetails = async (user: User) => {
    setDetailsUser(user);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setBillingHistory([]);
    setOwnedOrgs([]);
    setTotalSpent(0);

    const supabase = createClient();

    // Get organizations owned by this user with their subscriptions
    const { data: orgsOwned } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        subscriptions!inner (
          plan,
          source
        )
      `)
      .eq("owner_id", user.id);

    // Get billing events for orgs owned by this user
    const orgIds = orgsOwned?.map(o => o.id) || [];
    
    let totalPaid = 0;
    const orgsWithBilling: OrgWithBilling[] = [];

    if (orgIds.length > 0) {
      // Get billing events
      const { data: events } = await supabase
        .from("billing_events")
        .select(`
          *,
          organization:organization_id (name, slug)
        `)
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false })
        .limit(50);

      setBillingHistory(events || []);

      // Calculate total spent per org
      for (const org of orgsOwned || []) {
        const { data: payments } = await supabase
          .from("billing_events")
          .select("amount_cents")
          .eq("organization_id", org.id)
          .eq("event_type", "payment_success");

        const orgTotal = payments?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;
        totalPaid += orgTotal;

        orgsWithBilling.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: (org.subscriptions as any)?.plan || "free",
          source: (org.subscriptions as any)?.source || null,
          total_paid_cents: orgTotal,
        });
      }
    }

    setOwnedOrgs(orgsWithBilling);
    setTotalSpent(totalPaid);
    setDetailsLoading(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_success":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "payment_failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "key_redeemed":
      case "key_upgrade":
      case "key_extended":
        return <Gift className="w-4 h-4 text-purple-500" />;
      case "plan_upgraded":
        return <ArrowUpCircle className="w-4 h-4 text-blue-500" />;
      case "plan_downgraded":
        return <ArrowDownCircle className="w-4 h-4 text-amber-500" />;
      case "subscription_created":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "subscription_cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
    setKeyDuration("month");
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
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Active</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr 
                  key={user.id} 
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => loadUserDetails(user)}
                >
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
                        <p className="font-medium">{user.full_name || user.email?.split('@')[0] || "Unknown"}</p>
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
                    {user.last_active_at ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span>{formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSendKeyDialog(user);
                      }}
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
        <DialogContent className="max-w-lg">
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
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-bold font-mono tracking-wider truncate">
                    {generatedKey.key}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => copyToClipboard(generatedKey.key, "Key")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Redemption Link */}
              <div className="p-3 rounded-lg bg-muted/50 overflow-hidden">
                <p className="text-xs text-muted-foreground mb-2">Redemption Link</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate">
                    {generatedKey.redeemUrl}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="shrink-0"
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
                  <p className="text-sm font-medium">{selectedUser?.full_name || selectedUser?.email?.split('@')[0] || "Unknown"}</p>
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

      {/* User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                {detailsUser?.avatar_url ? (
                  <img src={detailsUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-medium">
                    {(detailsUser?.full_name || detailsUser?.email)?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold">{detailsUser?.full_name || detailsUser?.email?.split('@')[0] || "Unknown"}</p>
                <p className="text-sm text-muted-foreground font-normal">{detailsUser?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="billing">Billing History</TabsTrigger>
                <TabsTrigger value="studios">Studios Owned</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-auto space-y-4 py-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-green-500/10 border-green-500/20">
                    <div className="flex items-center gap-2 text-green-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">Total Spent</span>
                    </div>
                    <p className="text-2xl font-bold">${(totalSpent / 100).toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Studios Owned</span>
                    </div>
                    <p className="text-2xl font-bold">{ownedOrgs.length}</p>
                  </Card>
                  <Card className="p-4 bg-purple-500/10 border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Last Active</span>
                    </div>
                    <p className="text-lg font-bold">
                      {detailsUser?.last_active_at 
                        ? formatDistanceToNow(new Date(detailsUser.last_active_at), { addSuffix: true })
                        : "Never"
                      }
                    </p>
                  </Card>
                </div>

                {/* Quick Info */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Account Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{detailsUser?.id}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span>{detailsUser?.created_at ? format(new Date(detailsUser.created_at), "PPP") : "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member of</span>
                      <span>{detailsUser?.organizations.length || 0} studio(s)</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="flex-1 overflow-hidden py-4">
                <ScrollArea className="h-[300px]">
                  {billingHistory.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No billing history yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {billingHistory.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          {getEventIcon(event.event_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{formatEventType(event.event_type)}</span>
                              {event.amount_cents && event.amount_cents > 0 && (
                                <Badge variant="outline" className="text-green-500 border-green-500/30">
                                  ${(event.amount_cents / 100).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {event.organization?.name && (
                                <span className="mr-2">• {event.organization.name}</span>
                              )}
                              {event.previous_plan && event.new_plan && (
                                <span className="mr-2">• {event.previous_plan} → {event.new_plan}</span>
                              )}
                              {event.new_plan && !event.previous_plan && (
                                <span className="mr-2">• {event.new_plan}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(event.created_at), "PPp")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="studios" className="flex-1 overflow-hidden py-4">
                <ScrollArea className="h-[300px]">
                  {ownedOrgs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Doesn't own any studios</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {ownedOrgs.map((org) => (
                        <Card key={org.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-xs text-muted-foreground">/{org.slug}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                  {org.plan}
                                </Badge>
                                {org.source === "key" && (
                                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    <Gift className="w-3 h-3 mr-1" />
                                    Gifted
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Paid: ${(org.total_paid_cents / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
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
