"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { plans, type Plan } from "@/config/subscriptions";
import { Check, AlertCircle, CreditCard, Calendar, Download, X } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";

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
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-semibold">Billing Overview</h2>
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Period */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Current Period</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-2xl font-bold capitalize">{currentPlan?.name || "Free"}</p>
                    {subscription?.status === "active" && !isFreePlan && (
                      <Badge variant="default">Active</Badge>
                    )}
                    {isPastDue && (
                      <Badge variant="destructive">Past Due</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{currentPlan?.description}</p>
                </div>

                {!isFreePlan && subscription && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        ${subscription.interval === "month" ? currentPlan?.price.monthly : currentPlan?.price.yearly}
                        /{subscription.interval === "month" ? "month" : "year"}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {subscription.status === "active" && !isPastDue ? "Paid" : subscription.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Period ends {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  </>
                )}

                {isFreePlan && (
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                )}
              </div>
            </div>
          </div>

          {/* Next Period (only show if there's a change) */}
          {hasPendingChange && (
            <div className="space-y-4 border-l pl-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Next Period</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold capitalize">{pendingPlan?.name || "Free"}</p>
                      <Badge variant="outline">
                        {isCanceling ? "Cancellation Scheduled" : "Change Scheduled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pendingPlan?.description || "For hobbyists and side projects"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {pendingPlan && subscription?.pending_interval ? (
                        `$${subscription.pending_interval === "month" ? pendingPlan.price.monthly : pendingPlan.price.yearly}/${subscription.pending_interval === "month" ? "month" : "year"}`
                      ) : (
                        "$0/month"
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Starts {formatDate(subscription.current_period_end)}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      You'll retain {currentPlan?.name} features until {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>
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
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    <span className="text-sm">{feature.name}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-auto h-10 text-sm font-semibold"
                variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
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
