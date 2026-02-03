"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Key, Loader2, Check, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface KeyInfo {
  id: string;
  plan: string;
  duration: string;
  assigned_org_id: string | null;
  redeemed_at: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

function RedeemPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyFromUrl = searchParams.get("key") || "";
  
  const [key, setKey] = useState(keyFromUrl);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  // Load user and their organizations
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get organizations where user is owner
        const { data: memberships } = await supabase
          .from("organization_members")
          .select(`
            organization_id,
            role,
            organizations:organization_id (id, name, slug)
          `)
          .eq("user_id", user.id)
          .eq("role", "owner");

        if (memberships) {
          const orgs = memberships
            .map(m => m.organizations as unknown as Organization)
            .filter(Boolean);
          setOrganizations(orgs);
          if (orgs.length === 1) {
            setSelectedOrg(orgs[0].id);
          }
        }
      }
    }

    loadData();
  }, []);

  // Validate key from URL on load
  useEffect(() => {
    if (keyFromUrl && user) {
      validateKey(keyFromUrl);
    }
  }, [keyFromUrl, user]);

  const validateKey = async (keyToValidate: string) => {
    if (!keyToValidate.trim()) return;
    
    setValidating(true);
    setError("");
    setKeyInfo(null);

    try {
      const response = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToValidate.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Invalid key");
        return;
      }

      setKeyInfo(result.keyInfo);
      
      // If key is locked to an org, auto-select it
      if (result.keyInfo.assigned_org_id) {
        setSelectedOrg(result.keyInfo.assigned_org_id);
      }
    } catch {
      setError("Failed to validate key");
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedOrg || !keyInfo) return;

    setRedeeming(true);
    try {
      const response = await fetch("/api/keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          key: key.trim(),
          organizationId: selectedOrg,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to redeem key");
      }

      setRedeemed(true);
      toast.success(`Successfully activated ${keyInfo.plan} plan!`);
      
      // Redirect after a moment
      const org = organizations.find(o => o.id === selectedOrg);
      setTimeout(() => {
        router.push(`/studio/${org?.slug || ""}/settings?tab=billing`);
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to redeem key";
      toast.error(message);
    } finally {
      setRedeeming(false);
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
          <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Redeem Your Key</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to redeem your plan key.
          </p>
          <Link href={`/sign-in?redirect=${encodeURIComponent(`/redeem?key=${key}`)}`}>
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4">
      <div className="glass-card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Redeem Your Key</h1>
          <p className="text-muted-foreground mt-1">
            Enter your plan key to activate your subscription
          </p>
        </div>

        {redeemed ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Key Redeemed!</h2>
            <p className="text-muted-foreground">
              Redirecting to your billing page...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Input */}
            <div className="space-y-2">
              <Label>Plan Key</Label>
              <div className="flex gap-2">
                <Input
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value.toUpperCase());
                    setKeyInfo(null);
                    setError("");
                  }}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono"
                />
                <Button 
                  variant="outline" 
                  onClick={() => validateKey(key)}
                  disabled={validating || !key.trim()}
                >
                  {validating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Key Info */}
            {keyInfo && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Valid Key!</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">{keyInfo.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDuration(keyInfo.duration)}</span>
                  </div>
                  {keyInfo.assigned_org_id && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                      <p className="text-xs text-yellow-200">
                        This key is locked to a specific studio
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organization Selection */}
            {keyInfo && (
              <div className="space-y-2">
                <Label>Apply to Studio</Label>
                {organizations.length === 0 ? (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    You don&apos;t own any studios. Create a studio first to apply this key.
                  </div>
                ) : keyInfo.assigned_org_id ? (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">
                      {organizations.find(o => o.id === keyInfo.assigned_org_id)?.name || "Assigned Studio"}
                    </p>
                    <p className="text-xs text-muted-foreground">Key is locked to this studio</p>
                  </div>
                ) : (
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a studio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Redeem Button */}
            {keyInfo && (
              <Button 
                className="w-full" 
                onClick={handleRedeem}
                disabled={redeeming || !selectedOrg || organizations.length === 0}
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Activate {keyInfo.plan} Plan
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Need help? Contact support@creatorhub.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <RedeemPageContent />
    </Suspense>
  );
}
