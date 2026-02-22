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
  Copy,
  Link,
  Clock,
  DollarSign,
  History,
  Gift,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  CheckCircle,
  CreditCard
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface Studio {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  last_activity_at: string | null;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
    source: string | null;
  } | null;
  member_count: number;
  project_count: number;
}

interface BillingEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  previous_plan: string | null;
  new_plan: string | null;
  amount_cents: number | null;
  source: string;
  created_at: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, any> | null;
  user?: { email: string; full_name: string | null };
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
  const [keyDuration, setKeyDuration] = useState("month");
  const [sending, setSending] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; redeemUrl: string } | null>(null);

  // Studio Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStudio, setDetailsStudio] = useState<Studio | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingEvent[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  // Refund Dialog
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundEvent, setRefundEvent] = useState<BillingEvent | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("requested_by_customer");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    async function loadStudios() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
          search,
        });
        
        const response = await fetch(`/api/admin/studios?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch studios");
        }
        
        const { studios: studiosWithDetails, totalCount: count } = await response.json();
        
        // Map to expected format
        const studiosWithData = studiosWithDetails.map((s: any) => ({
          ...s,
          subscription: s.subscription || null,
          member_count: s.member_count || 0,
          project_count: s.project_count || 0,
        }));
        
        setStudios(studiosWithData);
        setTotalCount(count);
      } catch (error) {
        console.error("Failed to load studios:", error);
      }

      setLoading(false);
    }

    loadStudios();
  }, [page, search]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Load studio details with billing history
  const loadStudioDetails = async (studio: Studio) => {
    setDetailsStudio(studio);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setBillingHistory([]);
    setTotalPaid(0);
    setSubscriptionDetails(null);

    const supabase = createClient();

    // Get full subscription details
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", studio.id)
      .single();
    
    setSubscriptionDetails(sub);

    // Get billing events for this org
    const { data: events } = await supabase
      .from("billing_events")
      .select(`
        *,
        user:user_id (email, full_name)
      `)
      .eq("organization_id", studio.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setBillingHistory(events || []);

    // Calculate total paid
    const { data: payments } = await supabase
      .from("billing_events")
      .select("amount_cents")
      .eq("organization_id", studio.id)
      .eq("event_type", "payment_success");

    const total = payments?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;
    setTotalPaid(total);

    setDetailsLoading(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_success":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "payment_failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "refund":
        return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
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

  const openRefundDialog = (event: BillingEvent) => {
    setRefundEvent(event);
    setRefundAmount(event.amount_cents ? (event.amount_cents / 100).toFixed(2) : "");
    setRefundReason("requested_by_customer");
    setRefundOpen(true);
  };

  const handleRefund = async () => {
    if (!refundEvent) return;

    setRefunding(true);
    try {
      const response = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingEventId: refundEvent.id,
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
          reason: refundReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process refund");
      }

      toast.success(`Refund of $${(result.refund.amount / 100).toFixed(2)} processed successfully`);
      setRefundOpen(false);
      
      // Reload billing history
      if (detailsStudio) {
        loadStudioDetails(detailsStudio);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

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
    setKeyDuration("month");
    setGeneratedKey(null);
    setSendKeyOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Studios</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
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

      {/* Studios Table - Desktop */}
      <div className="glass-card overflow-hidden hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Studio</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Owner</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Members</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Projects</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Active</th>
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
                const isGifted = studio.subscription?.source === "key";
                return (
                  <tr 
                    key={studio.id} 
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => loadStudioDetails(studio)}
                  >
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
                            <p className="text-sm">{studio.owner.full_name || studio.owner.email?.split('@')[0] || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{studio.owner.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${planColors[plan] || planColors.free}`}>
                          {plan}
                        </span>
                        {isGifted && (
                          <span title="Gifted">
                            <Gift className="w-3 h-3 text-purple-400" />
                          </span>
                        )}
                      </div>
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
                      {studio.last_activity_at ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span>{format(new Date(studio.last_activity_at), "MMM d, yyyy HH:mm")}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSendKeyDialog(studio);
                          }}
                          title="Send Plan Key"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/studio/${studio.slug}`, "_blank");
                          }}
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
        <DialogContent className="max-w-lg">
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

      {/* Studio Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {detailsStudio?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold">{detailsStudio?.name}</p>
                <p className="text-sm text-muted-foreground font-normal">/{detailsStudio?.slug}</p>
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
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-auto space-y-4 py-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-green-500/10 border-green-500/20">
                    <div className="flex items-center gap-2 text-green-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold">${(totalPaid / 100).toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                      <FolderKanban className="w-4 h-4" />
                      <span className="text-xs font-medium">Projects</span>
                    </div>
                    <p className="text-2xl font-bold">{detailsStudio?.project_count || 0}</p>
                  </Card>
                  <Card className="p-4 bg-purple-500/10 border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Last Activity</span>
                    </div>
                    <p className="text-lg font-bold">
                      {detailsStudio?.last_activity_at 
                        ? format(new Date(detailsStudio.last_activity_at), "MMM d, yyyy HH:mm")
                        : "Never"
                      }
                    </p>
                  </Card>
                </div>

                {/* Quick Info */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Studio Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Studio ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{detailsStudio?.id}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{detailsStudio?.created_at ? format(new Date(detailsStudio.created_at), "PPP") : "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span>{detailsStudio?.owner?.email || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members</span>
                      <span>{detailsStudio?.member_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Plan</span>
                      <div className="flex items-center gap-2">
                        <Badge className={`${planColors[detailsStudio?.subscription?.plan || "free"]} capitalize`}>
                          {detailsStudio?.subscription?.plan || "free"}
                        </Badge>
                        {detailsStudio?.subscription?.source === "key" && (
                          <Badge className="bg-purple-500/20 text-purple-400">
                            <Gift className="w-3 h-3 mr-1" />
                            Gifted
                          </Badge>
                        )}
                      </div>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{formatEventType(event.event_type)}</span>
                              {event.amount_cents && event.amount_cents > 0 && (
                                <Badge variant="outline" className="text-green-500 border-green-500/30">
                                  ${(event.amount_cents / 100).toFixed(2)}
                                </Badge>
                              )}
                              {event.amount_cents && event.amount_cents < 0 && (
                                <Badge variant="outline" className="text-red-500 border-red-500/30">
                                  -${(Math.abs(event.amount_cents) / 100).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {event.previous_plan && event.new_plan && (
                                <span className="mr-2">• {event.previous_plan} → {event.new_plan}</span>
                              )}
                              {event.new_plan && !event.previous_plan && (
                                <span className="mr-2">• {event.new_plan}</span>
                              )}
                              {event.user?.email && (
                                <span className="mr-2">• by {event.user.email}</span>
                              )}
                            </div>
                            {/* Stripe Invoice ID */}
                            {event.stripe_invoice_id && (
                              <div className="text-xs mt-1">
                                <a 
                                  href={`https://dashboard.stripe.com/invoices/${event.stripe_invoice_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 w-fit"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {event.stripe_invoice_id.slice(0, 20)}...
                                </a>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(event.created_at), "PPp")}
                            </p>
                          </div>
                          {/* Refund button for payment_success events */}
                          {event.event_type === "payment_success" && event.amount_cents && event.amount_cents > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                              onClick={() => openRefundDialog(event)}
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="subscription" className="flex-1 overflow-hidden py-4">
                <ScrollArea className="h-[300px]">
                  {subscriptionDetails ? (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscription Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <Badge className={`${planColors[subscriptionDetails.plan]} capitalize`}>
                            {subscriptionDetails.plan}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={subscriptionDetails.status === "active" ? "default" : "destructive"}>
                            {subscriptionDetails.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source</span>
                          <span className="flex items-center gap-1">
                            {subscriptionDetails.source === "key" ? (
                              <>
                                <Gift className="w-3 h-3 text-purple-400" />
                                Key (Gifted)
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3 h-3" />
                                Stripe
                              </>
                            )}
                          </span>
                        </div>
                        {subscriptionDetails.current_period_start && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Period Start</span>
                            <span>{format(new Date(subscriptionDetails.current_period_start), "PPP")}</span>
                          </div>
                        )}
                        {subscriptionDetails.current_period_end && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Period End</span>
                            <span>{format(new Date(subscriptionDetails.current_period_end), "PPP")}</span>
                          </div>
                        )}
                        {subscriptionDetails.stripe_customer_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stripe Customer</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {subscriptionDetails.stripe_customer_id}
                            </code>
                          </div>
                        )}
                        {subscriptionDetails.previous_plan && (
                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-400">
                              <strong>Previous plan:</strong> {subscriptionDetails.previous_plan}
                              {subscriptionDetails.previous_stripe_subscription_id && (
                                <span> (Stripe sub paused)</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No subscription data</p>
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

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Process Refund</DialogTitle>
            <DialogDescription>
              Refund payment for {detailsStudio?.name}
            </DialogDescription>
          </DialogHeader>
          
          {refundEvent && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Original Payment</span>
                  <span className="font-medium text-green-500">
                    ${refundEvent.amount_cents ? (refundEvent.amount_cents / 100).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm">{format(new Date(refundEvent.created_at), "PPp")}</span>
                </div>
                {refundEvent.stripe_invoice_id && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Invoice</span>
                    <a 
                      href={`https://dashboard.stripe.com/invoices/${refundEvent.stripe_invoice_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in Stripe
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Refund Amount (leave empty for full refund)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={refundEvent.amount_cents ? (refundEvent.amount_cents / 100).toFixed(2) : "0.00"}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={refundReason} onValueChange={setRefundReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                    <SelectItem value="duplicate">Duplicate payment</SelectItem>
                    <SelectItem value="fraudulent">Fraudulent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">
                  <strong>Warning:</strong> Refunds are processed through Stripe and cannot be undone. 
                  The refund will appear in the customer's account within 5-10 business days.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refunding}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRefund} 
              disabled={refunding}
            >
              {refunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Process Refund</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
