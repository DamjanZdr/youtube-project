"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, ArrowLeft, User, Mail, Lock, Bell } from "lucide-react";
import Link from "next/link";

export default function AccountSettingsPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
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
        setAcceptInvites(profile.accept_invites ?? true);
      }
    }
    
    setLoading(false);
  };

  const handleSaveDisplayName = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: displayName })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving display name:", error);
      toast.error("Failed to save display name");
    } else {
      setUser({ ...user, full_name: displayName });
      toast.success("Display name updated successfully!");
    }
    setSaving(false);
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
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/hub" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hub</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal account settings
          </p>
        </div>

        {/* Profile Section */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Profile</h3>
          </div>
          
          {/* Profile Picture */}
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <div className="space-y-2">
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
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Password</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
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
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Notifications & Invites</h3>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
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
