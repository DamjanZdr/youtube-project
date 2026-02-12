"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { plans } from "@/config/subscriptions";

interface PendingStudioViewProps {
  studioName: string;
  studioSlug: string;
  organizationId: string;
}

export function PendingStudioView({ studioName, studioSlug, organizationId }: PendingStudioViewProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleCompleteCheckout() {
    // Default to creator plan monthly for now
    const planConfig = plans.find(p => p.id === 'creator');
    if (!planConfig || !planConfig.stripePriceId.monthly) {
      toast.error("Could not find plan configuration");
      return;
    }

    // Set checkout params in sessionStorage
    sessionStorage.setItem("checkoutParams", JSON.stringify({
      organizationId: organizationId,
      priceId: planConfig.stripePriceId.monthly,
    }));

    // Navigate to checkout
    router.push(`/studio/${studioSlug}/checkout`);
  }

  async function handleCancelStudio() {
    if (!confirm("Are you sure you want to cancel this studio? This cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId)
      .eq("status", "pending");

    if (error) {
      toast.error("Failed to cancel studio");
      console.error("Cancel pending studio error:", error);
    } else {
      toast.success("Pending studio cancelled");
      router.push("/hub");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold mb-2">{studioName}</h1>
            <p className="text-muted-foreground">
              This studio is awaiting payment to be activated.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleCompleteCheckout}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Complete Payment
            </Button>

            <div className="flex gap-2">
              <Link href="/hub" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Hub
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="lg"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleCancelStudio}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground">
            The studio will be automatically deleted if payment is not completed within 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
