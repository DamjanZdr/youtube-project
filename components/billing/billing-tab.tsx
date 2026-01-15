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
  const isFreePlan = !subscription || subscription.plan === "free";
  const isPastDue = subscription?.status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end;

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

  const getDaysUntilRenewal = () => {
    if (!subscription?.current_period_end) return 0;
    const end = new Date(subscription.current_period_end);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
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

      {/* Current Plan Card */}
      <Card className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold capitalize">{currentPlan?.name || "Free"}</h3>
              {isCanceling && (
                <Badge variant="destructive">Canceling</Badge>
              )}
              {isPastDue && (
                <Badge variant="destructive">Past Due</Badge>
              )}
              {subscription?.status === "active" && !isFreePlan && (
                <Badge variant="default">Active</Badge>
              )}
            </div>
            
            <p className="text-muted-foreground mb-4">
              {currentPlan?.description}
            </p>

            {!isFreePlan && subscription && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>
                    ${billingInterval === "monthly" ? currentPlan?.price.monthly : currentPlan?.price.yearly}
                    /{subscription.interval || "month"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {isCanceling 
                      ? `Cancels on ${formatDate(subscription.current_period_end)}`
                      : `Renews on ${formatDate(subscription.current_period_end)} (${getDaysUntilRenewal()} days)`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

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
          const isCurrent = plan.id === (subscription?.plan || "free");
          const price = billingInterval === "monthly" ? plan.price.monthly : plan.price.yearly;
          
          return (
            <Card
              key={plan.id}
              className={`glass-card p-6 relative flex flex-col ${
                plan.popular ? "ring-2 ring-primary" : ""
              } ${isCurrent ? "bg-primary/5" : ""}`}
            >
              {plan.popular && (
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
                disabled={isCurrent || loading === plan.id || (plan.id === "free" && isFreePlan)}
                onClick={() => handleUpgrade(plan)}
              >
                {loading === plan.id ? "Loading..." : 
                 isCurrent ? "Current Plan" :
                 plan.id === "free" ? "Downgrade" :
                 isFreePlan ? "Upgrade" :
                 plan.price[billingInterval] > (currentPlan?.price[billingInterval] || 0) ? "Upgrade" : "Downgrade"
                }
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
