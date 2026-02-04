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
      <DialogContent className="glass-strong border-white/10 !w-[95vw] !h-[90vh] !max-w-[95vw] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Studio Details */}
          <div className="w-[400px] flex-shrink-0 bg-gradient-to-b from-white/[0.03] to-transparent border-r border-white/10 p-8 flex flex-col">
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-2">Create Studio</h2>
              <p className="text-muted-foreground text-sm">Set up your YouTube workspace</p>
            </div>

            {/* Logo Upload */}
            <div className="mb-8">
              <label className="text-sm font-medium mb-4 block text-muted-foreground">Studio Logo</label>
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-xl flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 group relative mx-auto ring-1 ring-white/20 shadow-2xl shadow-purple-500/20"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-10 h-10 text-white/60 mx-auto mb-2" />
                    <span className="text-xs text-white/60 font-medium">Click to upload</span>
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
              <p className="text-xs text-muted-foreground text-center mt-3">PNG or JPG, 256×256px</p>
            </div>

            {/* Studio Name */}
            <div className="mb-8">
              <label htmlFor="studio-name" className="text-sm font-medium mb-3 block text-muted-foreground">
                Studio Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="studio-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My YouTube Channel"
                className="glass border-white/10 h-12 text-base bg-white/5 focus:bg-white/10 transition-colors"
                autoFocus
              />
            </div>

            {/* Key Redemption */}
            <div className="mt-auto pt-6 border-t border-white/10">
              {keyInfo ? (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Key Applied</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-white/10" onClick={clearKey}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 capitalize">
                      {keyInfo.plan}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {formatDuration(keyInfo.duration)}
                    </Badge>
                  </div>
                </div>
              ) : showKeyInput ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Redeem Key</label>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowKeyInput(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={redeemKey}
                      onChange={(e) => { setRedeemKey(e.target.value.toUpperCase()); setKeyError(""); }}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="font-mono text-sm bg-white/5"
                    />
                    <Button size="sm" onClick={validateKey} disabled={validatingKey || !redeemKey.trim()}>
                      {validatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {keyError && <p className="text-xs text-red-400">{keyError}</p>}
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2 h-11 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setShowKeyInput(true)}>
                  <Key className="w-4 h-4" />
                  Have a plan key?
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
          </div>

          {/* Right Panel - Plans */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Plan Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
              <h3 className="text-lg font-semibold">Choose a Plan</h3>
              
              {/* Billing Interval Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={() => setBillingInterval("monthly")}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingInterval === "monthly"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval("yearly")}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    billingInterval === "yearly"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                    SAVE 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-4 gap-5 h-full">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isKeyPlan = keyInfo?.plan === plan.id;
                  const isDisabled = keyInfo && !isKeyPlan;
                  const price = billingInterval === "monthly" ? plan.price.monthly : plan.price.yearly;
                  
                  return (
                    <Card
                      key={plan.id}
                      onClick={() => !isDisabled && setSelectedPlan(plan.id)}
                      className={`relative flex flex-col p-6 cursor-pointer transition-all duration-300 backdrop-blur-xl bg-white/[0.03] border-white/10 hover:bg-white/[0.06] ${
                        plan.popular && !keyInfo ? "ring-2 ring-primary/50 bg-primary/5" : ""
                      } ${isSelected ? "ring-2 ring-blue-500 bg-blue-500/10 scale-[1.02]" : ""} ${
                        isDisabled ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      {plan.popular && !keyInfo && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-lg">
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      {isKeyPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-green-500 text-white px-3 py-1 text-xs font-semibold shadow-lg">
                            <Key className="w-3 h-3 mr-1" /> Key Applied
                          </Badge>
                        </div>
                      )}

                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-3">{plan.name}</h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">${price}</span>
                          <span className="text-sm text-muted-foreground">
                            /{billingInterval === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                      </div>

                      <ul className="space-y-3 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            {feature.included ? (
                              <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                            ) : (
                              <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/20" />
                            )}
                            <span className={`text-sm ${!feature.included ? 'text-white/30' : 'text-white/80'}`}>
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

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/[0.02]">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="px-6">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !name.trim()} className="px-8 h-11 text-base font-medium">
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