"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { storeUTMParams, getStoredUTMParams, getStoredRefCode, getStoredRefTimestamp, clearRefCode, getDeviceInfo, getLocationInfo } from "@/lib/utils/utm";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ country: string | null; city: string | null }>({ country: null, city: null });
  const router = useRouter();

  // Capture UTM params and location on mount
  React.useEffect(() => {
    storeUTMParams();
    getLocationInfo().then(setLocation);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your display name");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Attach UTM, device, location, and ref info to user_metadata
      const utm = getStoredUTMParams();
      const device = getDeviceInfo();
      let refCode = getStoredRefCode();
      const refTimestamp = getStoredRefTimestamp();

      // Validate ref code against attribution window
      if (refCode && refTimestamp) {
        try {
          const lookupRes = await fetch(`/api/partners/lookup?code=${refCode}&clickTimestamp=${refTimestamp}`);
          const lookupData = await lookupRes.json();
          if (!lookupData.partner || lookupData.expired) {
            // Ref code expired or invalid, clear it
            refCode = null;
            clearRefCode();
          }
        } catch {
          // If lookup fails, still allow signup but without ref
          refCode = null;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/hub`,
          data: {
            full_name: displayName.trim(),
            utm,
            device,
            location,
            ref_code: refCode,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Logo */}
      <div className="flex items-center justify-center mb-2">
        <Image src="/bplogo.png" alt="Blueprint" width={160} height={40} className="h-10 w-auto" />
      </div>

      <div className="glass-card p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-1">
            Get started with Blueprint
          </p>
        </div>
        
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Your name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password">Confirm Password</Label>
              <Input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="glass"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full glow-primary" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </div>
        </form>
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
