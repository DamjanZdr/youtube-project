"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Check, Key, X, ImageIcon } from "lucide-react";
import { createStudio } from "@/lib/actions/studio";
import { plans as allPlans } from "@/config/subscriptions";
import { toast } from "sonner";

interface CreateStudioDialogProps {
  trigger?: React.ReactNode;
}

// Filter to just the plans we want to show (free, creator, studio, enterprise)
const plans = allPlans.filter(p => ["free", "creator", "studio", "enterprise"].includes(p.id));

export function CreateStudioDialog({ trigger }: CreateStudioDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [redeemKey, setRedeemKey] = useState("");
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyInfo, setKeyInfo] = useState<{ plan: string; duration: string } | null>(null);
  const [keyError, setKeyError] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogo(null);
      setLogoPreview(null);
    }
  };

  const validateKey = async () => {
    if (!redeemKey.trim()) return;
    
    setValidatingKey(true);
    setKeyError("");
    setKeyInfo(null);

    try {
      const response = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: redeemKey.trim().toUpperCase() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setKeyError(result.error || "Invalid key");
        return;
      }

      if (result.keyInfo.assigned_org_id) {
        setKeyError("This key is assigned to a specific studio and cannot be used here");
        return;
      }

      setKeyInfo({
        plan: result.keyInfo.plan,
        duration: result.keyInfo.duration,
      });
      setSelectedPlan(result.keyInfo.plan);
      toast.success(`Valid ${result.keyInfo.plan} key applied!`);
    } catch {
      setKeyError("Failed to validate key");
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter a studio name");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    if (logo) {
      formData.append("logo", logo);
    }

    const result = await createStudio(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // If we have a valid key, redeem it on the new studio
    if (keyInfo && redeemKey && result.slug) {
      try {
        const response = await fetch("/api/keys/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            key: redeemKey.trim().toUpperCase(),
            studioSlug: result.slug
          }),
        });

        if (!response.ok) {
          toast.error("Studio created but key redemption failed. You can redeem it later in billing.");
        } else {
          toast.success(`Studio created with ${keyInfo.plan} plan!`);
        }
      } catch {
        toast.error("Studio created but key redemption failed");
      }
    }

    // If user selected a paid plan without a key, redirect to checkout
    if (selectedPlan !== "free" && !keyInfo && result.slug) {
      const plan = plans.find(p => p.id === selectedPlan);
      if (plan?.stripePriceId?.yearly) {
        router.push(`/studio/${result.slug}/settings?tab=billing&upgrade=${selectedPlan}`);
        setOpen(false);
        resetForm();
        return;
      }
    }

    setOpen(false);
    resetForm();
    router.push(`/studio/${result.slug}`);
  };

  const resetForm = () => {
    setName("");
    setLogo(null);
    setLogoPreview(null);
    setSelectedPlan("free");
    setBillingInterval("yearly");
    setRedeemKey("");
    setKeyInfo(null);
    setKeyError("");
    setError("");
    setShowKeyInput(false);
  };

  const formatDuration = (duration: string) => {
    switch (duration) {
      case "month": return "1 Month";
      case "year": return "1 Year";
      case "lifetime": return "Lifetime";
      default: return duration;
    }
  };

  const clearKey = () => {
    setKeyInfo(null);
    setRedeemKey("");
    setSelectedPlan("free");
    setKeyError("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="glow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Studio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 w-[95vw] h-[90vh] max-w-none p-0 overflow-hidden">
        <div className="overflow-y-auto h-full p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1">Create Studio</h2>
            <p className="text-muted-foreground">Set up your YouTube workspace</p>
          </div>

          {/* Studio Details Row */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-white/10">
            {/* Logo Upload */}
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group relative flex-shrink-0"
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-6 h-6 text-white/70 mx-auto" />
                  <span className="text-[8px] text-white/70">Upload</span>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            
            {/* Studio Name */}
            <div className="flex-1 max-w-md">
              <label htmlFor="studio-name" className="text-sm font-medium mb-2 block">
                Studio Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="studio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My YouTube Channel"
                className="glass border-white/10"
                autoFocus
              />
            </div>
          </div>

          {/* Plan Selection Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Choose a Plan</h3>
              
              {/* Billing Interval Toggle */}
              <div className="flex items-center gap-2 glass-card p-1.5 rounded-lg">
                <button
                  onClick={() => setBillingInterval("monthly")}
                  className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                    billingInterval === "monthly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval("yearly")}
                  className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                    billingInterval === "yearly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <span className="ml-1.5 text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full">
                    -17%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isKeyPlan = keyInfo?.plan === plan.id;
                const isDisabled = keyInfo && !isKeyPlan;
                const price = billingInterval === "monthly" ? plan.price.monthly : plan.price.yearly;
                
                return (
                  <Card
                    key={plan.id}
                    onClick={() => !isDisabled && setSelectedPlan(plan.id)}
                    className={`glass-card p-5 relative flex flex-col cursor-pointer transition-all ${
                      plan.popular && !keyInfo ? "ring-2 ring-primary" : ""
                    } ${isSelected ? "ring-2 ring-blue-500 bg-blue-500/5" : ""} ${
                      isDisabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/30"
                    }`}
                  >
                    {plan.popular && !keyInfo && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">Popular</Badge>
                      </div>
                    )}
                    {isKeyPlan && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">
                          <Key className="w-3 h-3 mr-1" /> Key
                        </Badge>
                      </div>
                    )}

                    <div className="mb-4">
                      <h4 className="font-bold mb-1">{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">${price}</span>
                        <span className="text-xs text-muted-foreground">
                          /{billingInterval === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-sm">
                      {plan.features.slice(0, 5).map((feature, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className={`text-xs leading-tight ${!feature.included ? 'text-muted-foreground' : ''}`}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
            {/* Key Redemption */}
            <div>
              {keyInfo ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                  <Key className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">Key Applied:</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 capitalize text-xs">
                    {keyInfo.plan}
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                    {formatDuration(keyInfo.duration)}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={clearKey}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : showKeyInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={redeemKey}
                    onChange={(e) => { setRedeemKey(e.target.value.toUpperCase()); setKeyError(""); }}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="font-mono text-sm w-48"
                  />
                  <Button size="sm" onClick={validateKey} disabled={validatingKey || !redeemKey.trim()}>
                    {validatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowKeyInput(false)}>Cancel</Button>
                  {keyError && <span className="text-xs text-red-500">{keyError}</span>}
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowKeyInput(true)}>
                  <Key className="w-4 h-4" />
                  Have a plan key?
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {error && <span className="text-sm text-red-500">{error}</span>}
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : selectedPlan === "free" || keyInfo ? (
                  "Create Studio"
                ) : (
                  "Continue to Checkout"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}