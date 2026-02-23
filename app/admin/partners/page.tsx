"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Search,
  Plus,
  Loader2,
  Copy,
  Link,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  MousePointer,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PartnerUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface PartnerStats {
  total_visits: number;
  unique_visitors: number;
  total_signups: number;
  total_studios: number;
  conversion_rate: number;
  studios_by_plan: Record<string, number>;
  total_earnings_cents: number;
  paid_out_cents: number;
  pending_payout_cents: number;
}

interface Partner {
  id: string;
  user_id: string;
  code: string;
  name: string;
  commission_percent: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user: PartnerUser | null;
  stats: PartnerStats;
}

interface SearchUser {
  id: string;
  email: string;
  full_name: string | null;
}

const planColors: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-300",
  creator: "bg-blue-500/20 text-blue-300",
  studio: "bg-purple-500/20 text-purple-300",
  enterprise: "bg-orange-500/20 text-orange-300",
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add/Edit Partner Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(20);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);

  // Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/partners");
      if (!response.ok) throw new Error("Failed to fetch partners");
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error("Error loading partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      // Filter out users who are already partners
      const partnerUserIds = new Set(partners.map(p => p.user_id));
      const filtered = (data.users || []).filter((u: SearchUser) => !partnerUserIds.has(u.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  }

  function openAddDialog() {
    setEditingPartner(null);
    setSelectedUser(null);
    setUserSearch("");
    setSearchResults([]);
    setCode("");
    setName("");
    setCommissionPercent(20);
    setIsActive(true);
    setNotes("");
    setDialogOpen(true);
  }

  function openEditDialog(partner: Partner) {
    setEditingPartner(partner);
    setSelectedUser(partner.user ? { id: partner.user.id, email: partner.user.email, full_name: partner.user.full_name } : null);
    setCode(partner.code);
    setName(partner.name);
    setCommissionPercent(partner.commission_percent);
    setIsActive(partner.is_active);
    setNotes(partner.notes || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingPartner && !selectedUser) {
      toast.error("Please select a user");
      return;
    }
    if (!code.trim()) {
      toast.error("Please enter a referral code");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a partner name");
      return;
    }

    setSaving(true);
    try {
      if (editingPartner) {
        // Update
        const response = await fetch("/api/admin/partners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingPartner.id,
            code: code.trim(),
            name: name.trim(),
            commissionPercent,
            isActive,
            notes: notes.trim() || null,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update partner");
        }
        toast.success("Partner updated");
      } else {
        // Create
        const response = await fetch("/api/admin/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser!.id,
            code: code.trim(),
            name: name.trim(),
            commissionPercent,
            notes: notes.trim() || null,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create partner");
        }
        toast.success("Partner created");
      }
      setDialogOpen(false);
      loadPartners();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(partner: Partner) {
    if (!confirm(`Are you sure you want to remove ${partner.name} as a partner?`)) return;

    try {
      const response = await fetch(`/api/admin/partners?id=${partner.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete partner");
      toast.success("Partner removed");
      loadPartners();
    } catch (error) {
      toast.error("Failed to remove partner");
    }
  }

  function copyReferralLink(code: string) {
    const url = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied");
  }

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalVisits = partners.reduce((sum, p) => sum + p.stats.total_visits, 0);
  const totalSignups = partners.reduce((sum, p) => sum + p.stats.total_signups, 0);
  const totalEarnings = partners.reduce((sum, p) => sum + p.stats.total_earnings_cents, 0);
  const totalPending = partners.reduce((sum, p) => sum + p.stats.pending_payout_cents, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-muted-foreground">
            {partners.length} total partners
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSignups.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(totalEarnings / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">${(totalPending / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Partners Table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">Partner</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Commission</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Visits</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Signups</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Earnings</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? "No partners match your search" : "No partners yet"}
                </td>
              </tr>
            ) : (
              filteredPartners.map((partner) => (
                <tr 
                  key={partner.id} 
                  className="hover:bg-white/5 cursor-pointer"
                  onClick={() => {
                    setSelectedPartner(partner);
                    setDetailsOpen(true);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{partner.name}</p>
                        <p className="text-xs text-muted-foreground">{partner.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-white/10 px-2 py-0.5 rounded">{partner.code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyReferralLink(partner.code);
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm">{partner.commission_percent}%</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm">{partner.stats.total_visits.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm">{partner.stats.total_signups.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm font-medium">${(partner.stats.total_earnings_cents / 100).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(partner);
                        }}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(partner);
                        }}
                        title="Delete"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Partner Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle>
            <DialogDescription>
              {editingPartner ? "Update partner details" : "Add a new affiliate partner"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Search (only for new partners) */}
            {!editingPartner && (
              <div className="space-y-2">
                <Label>User</Label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by email..."
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="pl-10"
                      />
                    </div>
                    {searching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="border border-white/10 rounded-lg divide-y divide-white/5 max-h-48 overflow-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            className="w-full px-3 py-2 text-left hover:bg-white/5"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch("");
                              setSearchResults([]);
                              if (!name) setName(user.full_name || user.email.split("@")[0]);
                              if (!code) setCode(user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""));
                            }}
                          >
                            <p className="font-medium">{user.full_name || user.email}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Partner Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Partner Name</Label>
              <Input
                id="name"
                placeholder="e.g., Tech Review Channel"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Referral Code</Label>
              <Input
                id="code"
                placeholder="e.g., techreview"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Link: {window.location.origin}?ref={code || "code"}
              </p>
            </div>

            {/* Commission */}
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percentage</Label>
              <Select
                value={commissionPercent.toString()}
                onValueChange={(v) => setCommissionPercent(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Toggle (only for editing) */}
            {editingPartner && (
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this partner..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPartner ? "Save Changes" : "Add Partner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partner Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedPartner && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                    {selectedPartner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span>{selectedPartner.name}</span>
                    <p className="text-sm font-normal text-muted-foreground">{selectedPartner.user?.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Referral Link */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <Label className="text-muted-foreground">Referral Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-black/50 px-3 py-2 rounded">
                      {window.location.origin}?ref={selectedPartner.code}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyReferralLink(selectedPartner.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold">{selectedPartner.stats.total_visits.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold">{selectedPartner.stats.total_signups.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Signups</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold">{selectedPartner.stats.conversion_rate}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold">{selectedPartner.stats.total_studios}</p>
                    <p className="text-sm text-muted-foreground">Studios Created</p>
                  </div>
                </div>

                {/* Studios by Plan */}
                <div>
                  <Label className="text-muted-foreground">Studios by Plan</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(selectedPartner.stats.studios_by_plan).length > 0 ? (
                      Object.entries(selectedPartner.stats.studios_by_plan).map(([plan, count]) => (
                        <Badge key={plan} variant="outline" className={planColors[plan]}>
                          {plan}: {count}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No paid studios yet</p>
                    )}
                  </div>
                </div>

                {/* Earnings */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">
                      ${(selectedPartner.stats.total_earnings_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">
                      ${(selectedPartner.stats.paid_out_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Paid Out</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">
                      ${(selectedPartner.stats.pending_payout_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Commission Rate:</span>
                    <span className="ml-2 font-medium">{selectedPartner.commission_percent}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedPartner.is_active ? "default" : "secondary"} className="ml-2">
                      {selectedPartner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Partner Since:</span>
                    <span className="ml-2">{format(new Date(selectedPartner.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {selectedPartner.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedPartner.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setDetailsOpen(false);
                  openEditDialog(selectedPartner);
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Partner
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
