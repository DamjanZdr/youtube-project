"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      <div className="w-full max-w-md mx-auto">
        <div className="glass-card p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
          <p className="text-muted-foreground mb-4">
            We'll send your free Creator key to your email on launch day. Check your inbox for a confirmation!
          </p>
          <div className="text-sm text-muted-foreground">
            Launching <span className="text-primary font-semibold">February 20, 2026</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card p-6 md:p-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Want a free Creator key?</span>
        </div>
        
        <h3 className="text-xl md:text-2xl font-bold text-center mb-2">Join the Waitlist</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Get early access and a free month of Creator plan when we launch.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-white/5"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full h-12 glow-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Waitlist"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-sm text-muted-foreground">
            Launching <span className="text-primary font-semibold">February 20, 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
