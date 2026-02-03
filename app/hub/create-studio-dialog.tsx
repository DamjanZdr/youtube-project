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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Check, Key, Sparkles, ArrowRight, ArrowLeft, X } from "lucide-react";
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
  const [step, setStep] = useState<"details" | "plan">("details");
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

      // Check if key is locked to a different org
      if (result.keyInfo.assigned_org_id) {
        setKeyError("This key is assigned to a specific studio and cannot be used here");
        return;
      }

      setKeyInfo({
        plan: result.keyInfo.plan,
        duration: result.keyInfo.duration,
      });
      setSelectedPlan(result.keyInfo.plan);
      toast.success(`Valid ${result.keyInfo.plan} key!`);
    } catch {
      setKeyError("Failed to validate key");
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSubmit = async () => {
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
        // Get the studio ID from the slug
        const response = await fetch("/api/keys/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            key: redeemKey.trim().toUpperCase(),
            studioSlug: result.slug
          }),
        });

        if (!response.ok) {
          // Key redemption failed but studio was created - inform user
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
        // Redirect to checkout after studio creation
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
    setStep("details");
    setName("");
    setLogo(null);
    setLogoPreview(null);
    setSelectedPlan("free");
    setRedeemKey("");
    setKeyInfo(null);
    setKeyError("");
    setError("");
  };

  const formatDuration = (duration: string) => {
    switch (duration) {
      case "month": return "1 Month";
      case "year": return "1 Year";
      case "lifetime": return "Lifetime";
      default: return duration;
    }
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
      <DialogContent className={`glass-strong border-white/10 ${step === "plan" ? "sm:max-w-[700px]" : "sm:max-w-[425px]"}`}>
        {step === "details" ? (
          <form onSubmit={(e) => { e.preventDefault(); setStep("plan"); }}>
            <DialogHeader>
              <DialogTitle>Create a new studio</DialogTitle>
              <DialogDescription>
                A studio is a workspace for your YouTube channel. You can invite
                team members and manage multiple projects.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
              {/* Studio Name First */}
              <div>
                <label htmlFor="name" className="text-sm font-medium mb-2 block">
                  Studio name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Channel"
                  className="glass border-white/10"
                  autoFocus
                  required
                />
              </div>
              {/* Studio Icon Upload Modernized */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#dc2626] flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Studio icon preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white">{name?.[0]?.toUpperCase() || 'S'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={loading}
                  >
                    Upload Logo
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 256×256px, PNG or JPG</p>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Next: Choose Plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>Choose your plan</DialogTitle>
              <DialogDescription>
                Start free or upgrade for more features. You can change your plan anytime.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {/* Plan Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isKeyPlan = keyInfo?.plan === plan.id;
                  
                  return (
                    <Card
                      key={plan.id}
                      onClick={() => !keyInfo && setSelectedPlan(plan.id)}
                      className={`p-4 cursor-pointer transition-all relative ${
                        isSelected 
                          ? "border-2 border-blue-500 bg-blue-500/10" 
                          : "border-white/10 hover:border-white/30"
                      } ${keyInfo && !isKeyPlan ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {isKeyPlan && (
                        <Badge className="absolute -top-2 left-2 bg-green-500 text-xs">
                          <Key className="w-3 h-3 mr-1" /> Key
                        </Badge>
                      )}
                      <h4 className="font-semibold capitalize mb-1">{plan.name}</h4>
                      <div className="text-lg font-bold mb-2">
                        {plan.price.monthly === 0 ? "Free" : `$${plan.price.yearly}/yr`}
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <li key={i} className={f.included ? "" : "line-through opacity-50"}>
                            {f.name.split(":")[0]}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>

              {/* Redeem Key Section */}
              <div className="p-4 rounded-lg bg-muted/30 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Have a plan key?</span>
                </div>
                
                {keyInfo ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {keyInfo.plan.charAt(0).toUpperCase() + keyInfo.plan.slice(1)} Plan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(keyInfo.duration)} subscription
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => { setKeyInfo(null); setRedeemKey(""); setSelectedPlan("free"); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={redeemKey}
                      onChange={(e) => { setRedeemKey(e.target.value.toUpperCase()); setKeyError(""); }}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={validateKey}
                      disabled={validatingKey || !redeemKey.trim()}
                    >
                      {validatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {keyError && (
                  <p className="text-xs text-red-500 mt-2">{keyError}</p>
                )}
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("details")}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : selectedPlan === "free" || keyInfo ? (
                  "Create Studio"
                ) : (
                  <>
                    Continue to Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}