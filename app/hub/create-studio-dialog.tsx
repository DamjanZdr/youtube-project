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
import { Plus, Loader2, Check, Key, Sparkles, X, Upload, ImageIcon } from "lucide-react";
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
      <DialogContent className="glass-strong border-white/10 sm:max-w-[900px] p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left Side - Studio Details */}
          <div className="lg:w-[320px] p-6 border-b lg:border-b-0 lg:border-r border-white/10 bg-muted/30">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Create Studio</h2>
              <p className="text-sm text-muted-foreground">
                Set up your YouTube workspace
              </p>
            </div>

            {/* Logo Upload */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-3 block">Studio Logo</label>
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group relative"
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-6 h-6 text-white/70 mx-auto mb-1" />
                      <span className="text-[10px] text-white/70">Click to upload</span>
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
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG, max 2MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    256×256px recommended
                  </p>
                </div>
              </div>
            </div>

            {/* Studio Name */}
            <div className="mb-6">
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

            {/* Redeem Key Section */}
            <div className="pt-4 border-t border-white/10">
              {keyInfo ? (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">Key Applied</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={clearKey}
                    >
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Redeem Key</label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => setShowKeyInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={redeemKey}
                      onChange={(e) => { setRedeemKey(e.target.value.toUpperCase()); setKeyError(""); }}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="font-mono text-sm"
                    />
                    <Button 
                      size="sm"
                      onClick={validateKey}
                      disabled={validatingKey || !redeemKey.trim()}
                    >
                      {validatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {keyError && <p className="text-xs text-red-500">{keyError}</p>}
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setShowKeyInput(true)}
                >
                  <Key className="w-4 h-4" />
                  Have a plan key?
                </Button>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-4">{error}</p>
            )}
          </div>

          {/* Right Side - Plan Selection */}
          <div className="flex-1 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1">Choose Your Plan</h3>
              <p className="text-sm text-muted-foreground">
                Start free or upgrade for more features
              </p>
            </div>

            {/* Plan Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isKeyPlan = keyInfo?.plan === plan.id;
                const isDisabled = keyInfo && !isKeyPlan;
                
                return (
                  <Card
                    key={plan.id}
                    onClick={() => !isDisabled && setSelectedPlan(plan.id)}
                    className={`p-4 cursor-pointer transition-all relative ${
                      isSelected 
                        ? "ring-2 ring-blue-500 bg-blue-500/10" 
                        : "border-white/10 hover:border-white/30"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""} ${
                      plan.popular ? "border-primary/50" : ""
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {isKeyPlan && (
                      <Badge className="absolute -top-2 left-2 bg-green-500 text-white text-[10px] px-1.5">
                        <Key className="w-3 h-3 mr-0.5" /> Key
                      </Badge>
                    )}
                    {plan.popular && !keyInfo && (
                      <Badge className="absolute -top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5">
                        Popular
                      </Badge>
                    )}
                    
                    <div className="mb-3">
                      <h4 className="font-semibold text-base">{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">
                          {plan.price.yearly === 0 ? "Free" : `$${plan.price.yearly}`}
                        </span>
                        {plan.price.yearly > 0 && (
                          <span className="text-xs text-muted-foreground">/year</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {plan.description}
                    </p>
                    
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={`text-xs ${!feature.included ? 'text-muted-foreground/50' : ''}`}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Limits Badge */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {plan.limits.projects === -1 ? "∞" : plan.limits.projects} projects
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {plan.limits.teamMembers === -1 ? "∞" : plan.limits.teamMembers} members
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {plan.limits.storageGb === -1 ? "∞" : plan.limits.storageGb}GB
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !name.trim()}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : selectedPlan === "free" || keyInfo ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Studio
                  </>
                ) : (
                  <>
                    Continue to Checkout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}