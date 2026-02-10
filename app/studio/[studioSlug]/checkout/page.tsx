"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;
  const [error, setError] = useState<string | null>(null);

  // Read checkout params from sessionStorage (set by the create dialog or billing tab)
  const [checkoutParams, setCheckoutParams] = useState<{
    organizationId: string;
    priceId: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("checkoutParams");
    if (stored) {
      try {
        setCheckoutParams(JSON.parse(stored));
      } catch {
        setError("Invalid checkout parameters");
      }
    } else {
      setError("No checkout session found. Please select a plan first.");
    }
  }, []);

  const fetchClientSecret = useCallback(async () => {
    if (!checkoutParams) throw new Error("No checkout params");

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutParams),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to create checkout session");
    }

    // Clean up sessionStorage after successful session creation
    sessionStorage.removeItem("checkoutParams");

    return data.clientSecret;
  }, [checkoutParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold">Checkout Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push(`/studio/${studioSlug}/settings?tab=billing`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Billing
          </Button>
        </div>
      </div>
    );
  }

  if (!checkoutParams) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-12 px-4 pb-16">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div id="checkout" className="rounded-2xl overflow-clip">
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
