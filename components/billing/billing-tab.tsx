"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { plans, type Plan } from "@/config/subscriptions";
import { Check, AlertCircle, CreditCard, Calendar, Download, X } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession, createPortalSession, undoPendingChange } from "@/lib/actions/billing";

interface BillingTabProps {
  subscription: any;
  studioId: string;
}

export function BillingTab({ subscription, studioId }: BillingTabProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const currentPlan = plans.find(p => p.id === (subscription?.plan || "free"));
  const pendingPlan = subscription?.pending_plan ? plans.find(p => p.id === subscription.pending_plan) : null;
  const isFreePlan = !subscription || subscription.plan === "free";
  const isPastDue = subscription?.status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end;
  const hasPendingChange = isCanceling || !!pendingPlan;

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
          {!isFreePlan && (
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
                  {!isFreePlan && subscription && (
                    <span className="text-sm text-muted-foreground">
                      ({subscription.interval === "month" ? "Monthly" : "Yearly"})
                    </span>
                  )}
                </div>
                {isPastDue && (
                  <Badge variant="destructive" className="text-xs mb-2">Past Due</Badge>
                )}
                <p className="text-xs text-muted-foreground">{currentPlan?.description}</p>
              </div>

              {!isFreePlan && subscription && (
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

              {isFreePlan && (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">No active subscription</p>
                </div>
              )}
            </div>
          </div>

          {/* Next Billing Cycle */}
          {!isFreePlan && subscription && (
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
        </div>
      </Card>

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
              className={`glass-card p-6 relative flex flex-col ${
                plan.popular && !userHasHigherPlan ? "ring-2 ring-primary" : ""
              } ${isCurrent ? "bg-primary/5" : ""}`}
            >
              {plan.popular && !userHasHigherPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">Most Popular</Badge>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-sm text-muted-foreground">
                    /{billingInterval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${!feature.included ? 'text-muted-foreground' : ''}`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-auto h-10 text-sm font-semibold"
                variant={
                  isCurrent 
                    ? "outline" 
                    : (plan.popular && !userHasHigherPlan && thisPlanIndex >= currentPlanIndex) 
                      ? "default" 
                      : "outline"
                }
                disabled={isCurrent || loading === plan.id}
                onClick={() => handleUpgrade(plan)}
              >
                {buttonText}
              </Button>
            </Card>
          );
        })}
      </div>

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
    </div>
  );
}
