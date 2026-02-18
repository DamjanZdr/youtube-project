
import React from "react";
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { storeUTMParams, getStoredUTMParams, getDeviceInfo } from "@/lib/utils/utm";

export function WaitlistForm() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Capture UTM params on mount
  React.useEffect(() => {
    storeUTMParams();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {

      // Attach UTM and device info
      const utm = getStoredUTMParams();
      const device = getDeviceInfo();
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, utm, device }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to join waitlist");
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success("You're on the list!");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">You're in!</h3>
        <p className="text-muted-foreground mb-2">
          Your free Creator key will be sent to your email on launch day.
        </p>
        <p className="text-sm text-muted-foreground">
          Launching <span className="text-primary font-semibold">February 20, 2026</span>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-medium text-green-400">50+ creators already joined</span>
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        Get Your Free Key
      </h2>
      <p className="text-sm md:text-base text-muted-foreground mb-6">
        Join now and get a free Creator key ($12/mo value) when we launch.
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12 bg-white/5 border-white/10"
            disabled={loading}
          />
        </div>
        <Button type="submit" className="h-12 px-6 glow-primary whitespace-nowrap" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing up...
            </>
          ) : (
            "Claim Early Access"
          )}
        </Button>
      </form>
      
      <p className="text-xs text-muted-foreground">
        No credit card required • Limited spots available
      </p>
    </div>
  );
}
