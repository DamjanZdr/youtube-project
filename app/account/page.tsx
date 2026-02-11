"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, ArrowLeft, User, Mail, Lock, Bell, AtSign, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountSettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [acceptInvites, setAcceptInvites] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      
      if (profile) {
        setUser(profile);
        setDisplayName(profile.full_name || "");
        setUsername(profile.username || "");
        setAcceptInvites(profile.accept_invites ?? true);
      }
    }
    
    setLoading(false);
  };

  const handleSaveDisplayName = async () => {
    if (!user) return;
    
    // Validate username if set
    if (username && usernameError) {
      toast.error("Please fix username errors first");
      return;
    }
    
    if (username && usernameAvailable === false) {
      toast.error("Username is already taken");
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: displayName,
        username: username || null
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving profile:", error);
      if (error.message?.includes("profiles_username_unique")) {
        toast.error("Username is already taken");
      } else if (error.message?.includes("profiles_username_format")) {
        toast.error("Invalid username format");
      } else {
        toast.error("Failed to save profile");
      }
    } else {
      setUser({ ...user, full_name: displayName, username: username || null });
      toast.success("Profile updated successfully!");
    }
    setSaving(false);
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null; // Empty is OK (username is optional)
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-z0-9_]+$/.test(value)) return "Only lowercase letters, numbers, and underscores";
    return null;
  };

  const handleUsernameChange = async (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(normalized);
    setUsernameAvailable(null);
    
    const error = validateUsername(normalized);
    setUsernameError(error);
    
    if (error || !normalized) {
      return;
    }
    
    // Check if username is the same as current
    if (normalized === user?.username) {
      setUsernameAvailable(true);
      return;
    }
    
    // Check availability
    setCheckingUsername(true);
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();
    
    setCheckingUsername(false);
    
    if (fetchError) {
      console.error("Error checking username:", fetchError);
      return;
    }
    
    setUsernameAvailable(!data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("studio-assets")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("studio-assets")
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      
      if (!updateError) {
        setUser({ ...user, avatar_url: publicUrl });
        toast.success("Profile picture updated!");
      }
    } else {
      toast.error("Failed to upload image");
    }
    
    setUploadingAvatar(false);
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    
    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      console.error("Error sending password reset:", error);
      toast.error("Failed to send password reset email");
    } else {
      toast.success("Password reset email sent! Check your inbox.");
    }
    setSendingPasswordReset(false);
  };

  const toggleAcceptInvites = async (enabled: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ accept_invites: enabled })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update setting");
    } else {
      setAcceptInvites(enabled);
      toast.success(enabled ? "Invites enabled" : "Invites disabled");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 md:gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm md:text-base">Back</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Account Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your personal account settings
          </p>
        </div>

        {/* Profile Section */}
        <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-2 md:mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-base md:text-lg font-semibold">Profile</h3>
          </div>
          
          {/* Profile Picture */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 md:mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl md:text-3xl font-bold">{displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <label htmlFor="avatar-upload">
                <Button variant="outline" className="gap-2" disabled={uploadingAvatar} asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                    {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                  </span>
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground">
                Recommended: 256x256px, PNG or JPG
              </p>
            </div>
          </div>
          
          {/* Display Name */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Display Name</label>
            <Input 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass max-w-md"
              placeholder="Your display name"
            />
          </div>

          {/* Username */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Username
            </label>
            <div className="relative max-w-md">
              <Input 
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`glass pr-10 ${
                  usernameError ? "border-red-500/50" : 
                  usernameAvailable === true ? "border-green-500/50" :
                  usernameAvailable === false ? "border-red-500/50" : ""
                }`}
                placeholder="your_username"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : usernameError ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : usernameAvailable === true ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : usernameAvailable === false ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {usernameError ? (
              <p className="text-xs text-red-400">{usernameError}</p>
            ) : usernameAvailable === false ? (
              <p className="text-xs text-red-400">Username is already taken</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Used for @mentions in forums. Lowercase letters, numbers, and underscores only.
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <Input 
              value={user?.email || ""}
              disabled
              className="glass max-w-md bg-white/5"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveDisplayName} disabled={saving} className="glow-sm">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>

        {/* Password Section */}
        <div className="glass-card p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-base md:text-lg font-semibold">Password</h3>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Send a password reset email to {user?.email}
          </p>
          <Button 
            onClick={handleSendPasswordReset} 
            disabled={sendingPasswordReset}
            variant="outline"
          >
            {sendingPasswordReset ? "Sending..." : "Send Password Reset Email"}
          </Button>
        </div>

        {/* Notifications Section */}
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-base md:text-lg font-semibold">Notifications & Invites</h3>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium">Accept Studio Invites</p>
              <p className="text-xs text-muted-foreground">
                Allow other users to invite you to their studios
              </p>
            </div>
            <Switch
              checked={acceptInvites}
              onCheckedChange={toggleAcceptInvites}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
