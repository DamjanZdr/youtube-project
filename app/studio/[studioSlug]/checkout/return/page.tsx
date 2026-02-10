"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2, XCircle } from "lucide-react";

export default function CheckoutReturnPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.studioSlug as string;
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [planName, setPlanName] = useState<string>("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    // Check session status
    fetch(`/api/checkout/status?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "complete") {
          setStatus("success");
          setPlanName(data.planName || "your new plan");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">Confirming your subscription...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="glass-card p-10 max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            We couldn&apos;t confirm your subscription. If you were charged, your plan will be activated automatically.
          </p>
          <Button
            onClick={() => router.push(`/studio/${studioSlug}/settings?tab=billing`)}
            className="mt-4"
          >
            Go to Billing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="glass-card p-10 max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Subscription Active!</h2>
        <p className="text-muted-foreground">
          You&apos;re now on the <span className="text-foreground font-semibold capitalize">{planName}</span> plan. Enjoy your upgraded features!
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/studio/${studioSlug}/settings?tab=billing`)}
          >
            View Billing
          </Button>
          <Button
            onClick={() => router.push(`/studio/${studioSlug}`)}
          >
            Go to Studio
          </Button>
        </div>
      </div>
    </div>
  );
}
