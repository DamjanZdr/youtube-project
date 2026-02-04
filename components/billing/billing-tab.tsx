"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { plans, type Plan } from "@/config/subscriptions";
import { Check, AlertCircle, CreditCard, Calendar, Download, X, Key, Sparkles, Gift, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession, createPortalSession, undoPendingChange } from "@/lib/actions/billing";
import { createClient } from "@/lib/supabase/client";

interface PendingKey {
  id: string;
  key: string;
  plan: string;
  duration: string;
  sent_at: string;
}

interface BillingTabProps {
  subscription: any;
  studioId: string;
}

export function BillingTab({ subscription, studioId }: BillingTabProps) {
  const [loading, setLoading] = useState<string | null>(null);
  // Default to current subscription's interval, or monthly if no subscription
  const currentInterval = subscription?.interval === "year" ? "yearly" : "monthly";
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(currentInterval);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    plan: Plan | null;
    action: string;
    message: string;
  }>({
    open: false,
    plan: null,
    action: "",
    message: "",
  });

  // Key Activation Confirmation Dialog
  const [keyConfirmDialog, setKeyConfirmDialog] = useState<{
    open: boolean;
    pendingKey: PendingKey | null;
  }>({
    open: false,
    pendingKey: null,
  });

  // Redeem Key State
  const [redeemKey, setRedeemKey] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const redeemInputRef = useRef<HTMLInputElement>(null);

  // Pending Keys State
  const [pendingKeys, setPendingKeys] = useState<PendingKey[]>([]);
  const [loadingPendingKeys, setLoadingPendingKeys] = useState(true);

  // Member count state (for downgrade validation)
  const [memberCount, setMemberCount] = useState<number>(1);

  // Load pending keys and member count for this organization
  useEffect(() => {
    async function loadData() {
      setLoadingPendingKeys(true);
      const supabase = createClient();
      
      // Get keys assigned to this org that haven't been redeemed
      const { data: keys } = await supabase
        .from("plan_keys")
        .select("id, key, plan, duration, sent_at")
        .eq("assigned_org_id", studioId)
        .is("redeemed_at", null)
        .order("sent_at", { ascending: false });
      
      if (keys) {
        setPendingKeys(keys);
      }
      
      // Get member count
      const { count } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", studioId)
        .eq("status", "active");
      
      setMemberCount(count || 1);
      setLoadingPendingKeys(false);
    }
    
    if (studioId) {
      loadData();
    }
  }, [studioId]);

  const currentPlan = plans.find(p => p.id === (subscription?.plan || "free"));
  const pendingPlan = subscription?.pending_plan ? plans.find(p => p.id === subscription.pending_plan) : null;
  const isFreePlan = !subscription || subscription.plan === "free";
  const isPastDue = subscription?.status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end;
  const hasPendingChange = isCanceling || !!pendingPlan;
  const isGiftedPlan = subscription?.source === "key";
  const isLifetime = isGiftedPlan && !subscription?.current_period_end;

  const handleUpgrade = async (plan: Plan) => {
    if (loading) return;
    
    setLoading(plan.id);
    try {
      const priceId = billingInterval === "monthly" 
        ? plan.stripePriceId.monthly 
        : plan.stripePriceId.yearly;
      
      const { url } = await createCheckoutSession(studioId, priceId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("Failed to start checkout");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const showConfirmation = (plan: Plan) => {
    const currentPlanIndex = plans.findIndex(p => p.id === (subscription?.plan || "free"));
    const newPlanIndex = plans.findIndex(p => p.id === plan.id);
    const isSamePlan = plan.id === (subscription?.plan || "free");
    const currentInterval = subscription?.interval === "month" ? "monthly" : 
                           subscription?.interval === "year" ? "yearly" : 
                           "monthly";
    const isSameInterval = currentInterval === billingInterval;
    const price = billingInterval === "monthly" ? plan.price.monthly : plan.price.yearly;
    const isDowngrade = newPlanIndex < currentPlanIndex;
    
    // Check member limit for downgrades
    if (isDowngrade) {
      const targetMemberLimit = plan.limits.teamMembers;
      if (targetMemberLimit !== -1 && memberCount > targetMemberLimit) {
        const excess = memberCount - targetMemberLimit;
        toast.error(
          `Cannot downgrade: You have ${memberCount} members but ${plan.name} allows only ${targetMemberLimit}. Please remove ${excess} member${excess > 1 ? 's' : ''} first.`,
          { duration: 5000 }
        );
        return;
      }
    }
    
    let action = "";
    let message = "";
    
    if (plan.id === "free") {
      action = "Downgrade to Free";
      message = `Are you sure you want to cancel your ${currentPlan?.name} subscription? You'll continue to have access until the end of your current billing period.`;
    } else if (isSamePlan && !isSameInterval) {
      // Interval change
      const newInterval = billingInterval === "monthly" ? "monthly" : "yearly";
      const oldInterval = currentInterval === "monthly" ? "monthly" : "yearly";
      
      if (newInterval === "yearly") {
        action = `Switch to Yearly`;
        message = `Switch to ${plan.name} Yearly for $${price}/year? You'll be charged immediately with proration for the remaining time on your current plan.`;
      } else {
        action = `Switch to Monthly`;
        message = `Switch to ${plan.name} Monthly for $${price}/month? This change will take effect at the end of your current billing period.`;
      }
    } else if (newPlanIndex > currentPlanIndex) {
      // Upgrade
      action = `Upgrade to ${plan.name}`;
      message = `Upgrade to ${plan.name} ${billingInterval === "monthly" ? "Monthly" : "Yearly"} for $${price}/${billingInterval === "monthly" ? "month" : "year"}? You'll be charged immediately with proration for the remaining time on your current plan.`;
    } else {
      // Downgrade
      action = `Downgrade to ${plan.name}`;
      message = `Downgrade to ${plan.name} ${billingInterval === "monthly" ? "Monthly" : "Yearly"} for $${price}/${billingInterval === "monthly" ? "month" : "year"}? This change will take effect at the end of your current billing period.`;
    }
    
    setConfirmDialog({
      open: true,
      plan,
      action,
      message,
    });
  };

  const confirmPlanChange = async () => {
    if (!confirmDialog.plan) return;
    
    setConfirmDialog({ ...confirmDialog, open: false });
    await handleUpgrade(confirmDialog.plan);
  };

  const handleManageBilling = async () => {
    setLoading("portal");
    try {
      const { url } = await createPortalSession(studioId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("Failed to open billing portal");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleUndoChange = async () => {
    setLoading("undo");
    try {
      await undoPendingChange(studioId);
      toast.success("Pending change cancelled. Your current plan will continue.");
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      toast.error("Failed to cancel pending change");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleRedeemKey = async () => {
    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemSuccess(null);
    try {
      const res = await fetch("/api/keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: redeemKey.trim().toUpperCase(), organization_id: studioId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error || "Failed to redeem key");
      } else {
        // Build success message based on response
        let successMsg = data.message || `Activated ${data.plan} plan`;
        if (data.expires_at) {
          successMsg += ` until ${new Date(data.expires_at).toLocaleDateString()}`;
        } else {
          successMsg += " (lifetime)";
        }
        if (data.extended) {
          successMsg = `🎉 ${successMsg} - Time added to existing plan!`;
        } else if (data.upgraded) {
          successMsg = `🚀 ${successMsg}`;
        }
        setRedeemSuccess(successMsg);
        setRedeemKey("");
        setShowKeyInput(false);
        toast.success(successMsg);
        // Optionally, refresh the page or subscription info
        window.location.reload();
      }
    } catch (err) {
      setRedeemError("Failed to redeem key");
    } finally {
      setRedeemLoading(false);
    }
  };

  const openKeyConfirmDialog = (pendingKey: PendingKey) => {
    setKeyConfirmDialog({ open: true, pendingKey });
  };

  const handleConfirmKeyActivation = async () => {
    if (!keyConfirmDialog.pendingKey) return;
    
    const key = keyConfirmDialog.pendingKey.key;
    setKeyConfirmDialog({ open: false, pendingKey: null });
    setRedeemLoading(true);
    
    try {
      const res = await fetch("/api/keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, organization_id: studioId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to redeem key");
      } else {
        // Build success message
        let successMsg = data.message || `Activated ${data.plan} plan`;
        if (data.extended) {
          toast.success(`🎉 ${successMsg} - Time extended!`);
        } else if (data.upgraded) {
          toast.success(`🚀 ${successMsg}`);
        } else {
          toast.success(successMsg);
        }
        window.location.reload();
      }
    } catch (err) {
      toast.error("Failed to redeem key");
    } finally {
      setRedeemLoading(false);
    }
  };

  // Helper to get what happens when activating a key
  const getKeyActivationDetails = (pendingKey: PendingKey) => {
    const keyPlan = plans.find(p => p.id === pendingKey.plan);
    const currentPlanName = currentPlan?.name || "Free";
    const keyPlanName = keyPlan?.name || pendingKey.plan;
    
    // Calculate dates
    const startDate = new Date();
    let endDate: Date | null = null;
    if (pendingKey.duration === "month") {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (pendingKey.duration === "year") {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Determine what happens to current plan
    const isCurrentlyPaid = subscription?.plan && subscription.plan !== "free";
    const isSamePlan = subscription?.plan === pendingKey.plan;
    const isUpgrade = keyPlan && currentPlan && 
      (keyPlan.price.yearly > currentPlan.price.yearly);
    
    return {
      keyPlanName,
      currentPlanName,
      startDate,
      endDate,
      isLifetime: pendingKey.duration === "lifetime",
      isCurrentlyPaid,
      isSamePlan,
      isUpgrade,
    };
  };

  const handleRedeemPendingKey = async (key: string) => {
    setRedeemLoading(true);
    try {
      const res = await fetch("/api/keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, organization_id: studioId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to redeem key");
      } else {
        // Build success message
        let successMsg = data.message || `Activated ${data.plan} plan`;
        if (data.extended) {
          toast.success(`🎉 ${successMsg} - Time extended!`);
        } else if (data.upgraded) {
          toast.success(`🚀 ${successMsg}`);
        } else {
          toast.success(successMsg);
        }
        window.location.reload();
      }
    } catch (err) {
      toast.error("Failed to redeem key");
    } finally {
      setRedeemLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    switch (duration) {
      case "month": return "1 Month";
      case "year": return "1 Year";
      case "lifetime": return "Lifetime";
      default: return duration;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      {/* Payment Issue Banner */}
      {isPastDue && (
        <div className="glass-card p-4 border-2 border-red-500/50 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-500">Payment Failed</h4>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn`'t process your last payment. Please update your payment method to avoid service interruption.
                {subscription.grace_period_end && (
                  <span className="block mt-1 font-medium">
                    Access will be restricted on {formatDate(subscription.grace_period_end)}
                  </span>
                )}
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleManageBilling}
                disabled={loading === "portal"}
                className="mt-3"
              >
                Update Payment Method
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Overview Card */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Billing Overview</h2>
          {!isFreePlan && !isGiftedPlan && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? "Loading..." : "Manage Billing"}
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Billing Cycle */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-500 rounded-full" />
              <h3 className="font-semibold">Current Billing Cycle</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-2xl font-bold capitalize">
                    {currentPlan?.name || "Free"}
                  </p>
                  {!isFreePlan && subscription && !isGiftedPlan && (
                    <span className="text-sm text-muted-foreground">
                      ({subscription.interval === "month" ? "Monthly" : "Yearly"})
                    </span>
                  )}
                  {isGiftedPlan && (
                    <span className="text-sm text-muted-foreground">
                      ({isLifetime ? "Lifetime" : subscription?.interval === "month" ? "Monthly" : "Yearly"})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {isGiftedPlan && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                      <Gift className="w-3 h-3 mr-1" />
                      Gifted
                    </Badge>
                  )}
                  {isPastDue && (
                    <Badge variant="destructive" className="text-xs">Past Due</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{currentPlan?.description}</p>
              </div>

              {!isFreePlan && subscription && !isGiftedPlan && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Cycle Period</span>
                    <span className="font-medium">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Payment Date</span>
                    <span className="font-medium">{formatDate(subscription.current_period_start)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                        {subscription.status === "active" && !isPastDue ? "Paid" : subscription.status}
                      </Badge>
                      <span className="font-bold">
                        ${subscription.interval === "month" ? currentPlan?.price.monthly : currentPlan?.price.yearly}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Gifted Plan Details */}
              {!isFreePlan && subscription && isGiftedPlan && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Activated</span>
                    <span className="font-medium">{formatDate(subscription.current_period_start)}</span>
                  </div>
                  {isLifetime ? (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-purple-500">♾️ Lifetime Access</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Expires</span>
                      <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Cost</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30 text-xs">
                        <Gift className="w-3 h-3 mr-1" />
                        Free Gift
                      </Badge>
                      <span className="font-bold text-muted-foreground line-through">
                        ${subscription.interval === "month" || !subscription.interval ? currentPlan?.price.yearly : currentPlan?.price.yearly}
                      </span>
                    </div>
                  </div>
                  {subscription.previous_plan && subscription.previous_plan !== "free" && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Your previous {subscription.previous_plan} Stripe subscription is paused. 
                        It will resume when this gifted plan expires.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isFreePlan && (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">No active subscription</p>
                </div>
              )}
            </div>
          </div>

          {/* Next Billing Cycle - for Stripe subscriptions */}
          {!isFreePlan && subscription && !isGiftedPlan && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-amber-500 rounded-full" />
                <h3 className="font-semibold">Next Billing Cycle</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-2xl font-bold capitalize">
                      {pendingPlan?.name || (isCanceling ? "Free" : currentPlan?.name)}
                    </p>
                    {!isCanceling && (
                      <span className="text-sm text-muted-foreground">
                        ({pendingPlan && subscription?.pending_interval 
                          ? (subscription.pending_interval === "month" ? "Monthly" : "Yearly")
                          : subscription?.interval === "month" ? "Monthly" : "Yearly"
                        })
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {hasPendingChange && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                        {isCanceling ? "Cancellation Scheduled" : "Change Scheduled"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingPlan?.description || (isCanceling ? "For hobbyists and side projects" : currentPlan?.description)}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Cycle Starts</span>
                    <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                  </div>
                  
                  {!isCanceling && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Next Payment</span>
                        <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t">
                        <span className="text-muted-foreground">Amount Due</span>
                        <span className="font-bold">
                          {pendingPlan && subscription.pending_interval ? (
                            `$${subscription.pending_interval === "month" ? pendingPlan.price.monthly : pendingPlan.price.yearly}`
                          ) : (
                            `$${subscription.interval === "month" ? currentPlan?.price.monthly : currentPlan?.price.yearly}`
                          )}
                        </span>
                      </div>
                    </>
                  )}

                  {isCanceling && (
                    <div className="flex justify-between items-center text-xs pt-2 border-t">
                      <span className="text-muted-foreground">Amount Due</span>
                      <span className="font-bold">$0</span>
                    </div>
                  )}
                </div>

                {hasPendingChange && (
                  <div className="space-y-2 pt-2">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {isCanceling 
                          ? `You'll retain ${currentPlan?.name} features until ${formatDate(subscription.current_period_end)}`
                          : `Your plan will change to ${pendingPlan?.name} on ${formatDate(subscription.current_period_end)}`
                        }
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndoChange}
                      disabled={loading === "undo"}
                      className="w-full"
                    >
                      {loading === "undo" ? "Cancelling..." : "Undo Change"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What Happens When Gift Expires - for gifted plans */}
          {!isFreePlan && subscription && isGiftedPlan && !isLifetime && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                <h3 className="font-semibold">When Gift Expires</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-2xl font-bold capitalize">
                      {subscription.previous_plan && subscription.previous_plan !== "free" 
                        ? plans.find(p => p.id === subscription.previous_plan)?.name || subscription.previous_plan
                        : "Free"
                      }
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {subscription.previous_plan && subscription.previous_plan !== "free"
                      ? "Your original Stripe subscription will resume"
                      : "You'll revert to the free tier"
                    }
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Gift Expires</span>
                    <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-400">
                    Enjoy your gifted {currentPlan?.name} plan until {formatDate(subscription.current_period_end)}! 
                    {subscription.previous_plan && subscription.previous_plan !== "free"
                      ? ` Your ${subscription.previous_plan} subscription will automatically resume after.`
                      : " You can upgrade anytime to keep your features."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lifetime Gift - no expiration */}
          {!isFreePlan && subscription && isGiftedPlan && isLifetime && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                <h3 className="font-semibold">Lifetime Access</h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-lg font-bold text-purple-400 mb-1">You're Set for Life!</p>
                  <p className="text-xs text-muted-foreground">
                    Your {currentPlan?.name} plan never expires. Enjoy all features forever.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card> {/* End of Billing Overview Card */}

      {/* Billing Interval Toggle */}
      <div className="flex items-center justify-center gap-4 glass-card p-3 w-fit mx-auto">
        <button
          onClick={() => setBillingInterval("monthly")}
          className={`px-4 py-2 rounded-lg transition-all ${
            billingInterval === "monthly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval("yearly")}
          className={`px-4 py-2 rounded-lg transition-all ${
            billingInterval === "yearly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="ml-2 text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
            Save 17%
          </span>
        </button>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
        {plans.map((plan) => {
          const isSamePlan = plan.id === (subscription?.plan || "free");
          // Normalize interval - Stripe uses "month"/"year", we use "monthly"/"yearly"
          const currentInterval = subscription?.interval === "month" ? "monthly" : 
                                 subscription?.interval === "year" ? "yearly" : 
                                 "monthly";
          const isSameInterval = currentInterval === billingInterval;
          const isCurrent = isSamePlan && isSameInterval;
          const price = billingInterval === "monthly" ? plan.price.monthly : plan.price.yearly;
          const currentPlanIndex = plans.findIndex(p => p.id === (subscription?.plan || "free"));
          const thisPlanIndex = plans.findIndex(p => p.id === plan.id);
          const userHasHigherPlan = currentPlanIndex > thisPlanIndex;
          
          // Check if downgrade is blocked due to member limits
          const isDowngrade = thisPlanIndex < currentPlanIndex;
          const planMemberLimit = plan.limits.teamMembers;
          const exceedsMemberLimit = isDowngrade && planMemberLimit !== -1 && memberCount > planMemberLimit;
          const memberExcess = exceedsMemberLimit ? memberCount - planMemberLimit : 0;
          
          // Button text logic
          let buttonText = "Upgrade";
          if (loading === plan.id) {
            buttonText = "Loading...";
          } else if (isCurrent) {
            buttonText = "Current Plan";
          } else if (isSamePlan && !isSameInterval) {
            // Same plan, different interval
            buttonText = `Switch to ${billingInterval === "monthly" ? "Monthly" : "Yearly"}`;
          } else if (plan.id === "free") {
            buttonText = "Downgrade to Free";
          } else if (isFreePlan) {
            buttonText = "Upgrade";
          } else {
            // Different plan - compare by tier
            buttonText = thisPlanIndex > currentPlanIndex ? "Upgrade" : "Downgrade";
          }
          
          return (
            <Card
              key={plan.id}
              className={`glass-card p-8 relative flex flex-col min-h-[520px] ${
                plan.popular && !userHasHigherPlan ? "ring-2 ring-primary" : ""
              } ${isCurrent ? "bg-primary/5" : ""} ${exceedsMemberLimit ? "opacity-60" : ""}`}
            >
              {plan.popular && !userHasHigherPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">Most Popular</Badge>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-xl font-bold mb-3">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-sm text-muted-foreground">
                    /{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-tight min-h-[32px]">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-5 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className={`text-xs leading-tight ${!feature.included ? 'text-muted-foreground' : ''}`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Member limit warning for downgrades */}
              {exceedsMemberLimit && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Remove {memberExcess} member{memberExcess > 1 ? 's' : ''} to downgrade ({memberCount}/{planMemberLimit})
                    </p>
                  </div>
                </div>
              )}

              <Button
                className="w-full mt-auto h-10 text-sm font-semibold"
                variant={
                  isCurrent 
                    ? "outline" 
                    : (plan.popular && !userHasHigherPlan && thisPlanIndex >= currentPlanIndex) 
                      ? "default" 
                      : "outline"
                }
                disabled={isCurrent || loading === plan.id || exceedsMemberLimit}
                onClick={() => showConfirmation(plan)}
              >
                {buttonText}
              </Button>
            </Card>
          );
        })}
      </div> {/* End of plans grid */}

      {/* Pending Keys Section */}
      {pendingKeys.length > 0 && (
        <Card className="glass-card max-w-2xl mx-auto mt-10 p-6 border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">You Have a Plan Key!</h3>
              <p className="text-sm text-muted-foreground">
                {pendingKeys.length === 1 ? "A key has been" : `${pendingKeys.length} keys have been`} assigned to this studio
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {pendingKeys.map((pendingKey) => (
              <div 
                key={pendingKey.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-green-500" />
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {pendingKey.key}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {pendingKey.plan}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      {formatDuration(pendingKey.duration)}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => openKeyConfirmDialog(pendingKey)}
                  disabled={redeemLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Activate Now
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Redeem Key Section (below plans, above billing history) */}
      <Card className="glass-card max-w-md mx-auto mt-10 p-6">
        {showKeyInput ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Redeem Key</label>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setShowKeyInput(false); setRedeemKey(""); setRedeemError(null); }}>
                Cancel
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                ref={redeemInputRef}
                value={redeemKey}
                onChange={(e) => { setRedeemKey(e.target.value.toUpperCase()); setRedeemError(null); }}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono text-sm bg-white/5"
                disabled={redeemLoading}
              />
              <Button size="sm" onClick={handleRedeemKey} disabled={redeemLoading || !redeemKey.trim()}>
                {redeemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {redeemError && <p className="text-xs text-red-400">{redeemError}</p>}
            {redeemSuccess && <p className="text-xs text-green-400">{redeemSuccess}</p>}
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-2 h-11 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setShowKeyInput(true)}>
            <Key className="w-4 h-4" />
            Have a plan key?
          </Button>
        )}
      </Card>

      {/* Billing History */}
      {!isFreePlan && subscription && (
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Billing History</h3>
          <div className="text-center py-8 text-muted-foreground">
            <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No invoices yet</p>
            <p className="text-sm">Your billing history will appear here</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={loading === "portal"}
              className="mt-4"
            >
              View in Billing Portal
            </Button>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.action}</DialogTitle>
            <DialogDescription className="pt-4">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPlanChange}
              disabled={loading !== null}
            >
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Activation Confirmation Dialog */}
      <Dialog open={keyConfirmDialog.open} onOpenChange={(open) => setKeyConfirmDialog({ ...keyConfirmDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-green-500" />
              Activate Plan Key
            </DialogTitle>
          </DialogHeader>
          
          {keyConfirmDialog.pendingKey && (() => {
            const details = getKeyActivationDetails(keyConfirmDialog.pendingKey);
            return (
              <div className="space-y-4 py-4">
                {/* Key Info */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 capitalize text-sm px-3 py-1">
                      {details.keyPlanName}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-sm px-3 py-1">
                      {formatDuration(keyConfirmDialog.pendingKey.duration)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Key: <code className="font-mono bg-muted px-2 py-0.5 rounded">{keyConfirmDialog.pendingKey.key}</code>
                  </p>
                </div>

                {/* What will happen */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">What will happen:</h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Duration */}
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        {details.isLifetime ? (
                          <>Your studio will be upgraded to <strong>{details.keyPlanName}</strong> permanently</>
                        ) : (
                          <>
                            Your studio will have <strong>{details.keyPlanName}</strong> from{" "}
                            <strong>{details.startDate.toLocaleDateString()}</strong> to{" "}
                            <strong>{details.endDate?.toLocaleDateString()}</strong>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Current plan handling */}
                    {details.isCurrentlyPaid && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>
                          {details.isSamePlan ? (
                            <>Your current {details.currentPlanName} subscription time will be <strong>extended</strong></>
                          ) : details.isUpgrade ? (
                            <>Your current {details.currentPlanName} plan will be <strong>upgraded</strong> to {details.keyPlanName}</>
                          ) : (
                            <>Your current {details.currentPlanName} subscription will be <strong>replaced</strong> with this key</>
                          )}
                        </span>
                      </div>
                    )}

                    {/* After expiry */}
                    {!details.isLifetime && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          After the key expires, your studio will revert to the <strong>Free</strong> plan unless you subscribe
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setKeyConfirmDialog({ open: false, pendingKey: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmKeyActivation}
              disabled={redeemLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {redeemLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Activate Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}