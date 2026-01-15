"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Settings as SettingsIcon, 
  Users,
  CreditCard,
  Trash2,
  Upload,
  UserPlus,
  Crown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BillingTab } from "@/components/billing/billing-tab";

interface SettingsPageProps {
  params: Promise<{ studioSlug: string }>;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { studioSlug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studio, setStudio] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState("studio");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    // Get tab from URL or default to studio
    const tab = searchParams.get('tab') || 'studio';
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [studioSlug]);

  const loadData = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (profile) {
        setUser(profile);
        setDisplayName(profile.full_name || '');
      }
    }
    
    // Fetch studio data
    const { data: studioData, error: studioError } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", studioSlug)
      .single();

    if (studioError) {
      console.error("Error loading studio:", studioError);
      setLoading(false);
      return;
    }

    if (studioData) {
      setStudio(studioData);
      setName(studioData.name);
      setSlug(studioData.slug);

      // Fetch all members including pending invites from organization_members table
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          joined_at,
          status,
          user:profiles!organization_members_user_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq("organization_id", studioData.id)
        .order("joined_at", { ascending: true });

      if (!membersError && membersData) {
        setMembers(membersData);
      } else {
        console.error("Members error:", membersError);
      }

      // Fetch subscription (may not exist - that's ok)
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", studioData.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows

      if (subData) {
        setSubscription(subData);
      }
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!studio) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        slug
      })
      .eq("id", studio.id);

    if (error) {
      console.error("Error saving studio:", error);
      if (error.code === '23505') {
        toast.error('This studio URL is already taken. Please choose a different one.');
      } else {
        toast.error('Failed to save studio settings');
      }
    } else {
      setStudio({ ...studio, name, slug });
      toast.success('Studio settings saved successfully!');
      // If slug changed, redirect to new URL
      if (slug !== studioSlug) {
        router.push(`/studio/${slug}/settings`);
      }
    }
    setSaving(false);
  };

  const handleSaveDisplayName = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: displayName })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving display name:', error);
      toast.error('Failed to save display name');
    } else {
      setUser({ ...user, full_name: displayName });
      toast.success('Display name updated successfully!');
    }
    setSaving(false);
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    
    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    } else {
      toast.success('Password reset email sent! Check your inbox.');
    }
    setSendingPasswordReset(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-assets')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('studio-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (!updateError) {
        setUser({ ...user, avatar_url: publicUrl });
        toast.success('Profile picture updated successfully!');
      } else {
        toast.error('Failed to update profile picture');
      }
    } else {
      toast.error('Failed to upload profile picture');
    }
    
    setUploadingAvatar(false);
  };

  const getMemberLimit = () => {
    const plan = subscription?.plan || 'free';
    switch (plan) {
      case 'free':
      case 'pro':
        return 1;
      case 'team':
        return 4;
      case 'enterprise':
        return 999; // Unlimited
      default:
        return 1;
    }
  };

  const canAddMember = () => {
    const limit = getMemberLimit();
    return members.length < limit;
  };

  const handleInviteMember = async () => {
    if (!studio || !inviteEmail) return;
    
    setInviting(true);
    
    // Check if user exists and get their invite preference
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, accept_invites')
      .eq('email', inviteEmail)
      .single();

    if (!existingUser) {
      toast.error('User not found. They need to sign up first.');
      setInviting(false);
      return;
    }

    // Check if user accepts invites
    if (!existingUser.accept_invites) {
      toast.error('Cannot send invite. This user has invitations turned off.');
      setInviting(false);
      return;
    }

    // Check if already a member or has pending invite
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('status')
      .eq('organization_id', studio.id)
      .eq('user_id', existingUser.id)
      .single();

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        toast.error('This user is already a member.');
      } else {
        toast.error('This user already has a pending invite.');
      }
      setInviting(false);
      return;
    }

    // Get current user for invited_by
    const { data: { user } } = await supabase.auth.getUser();

    // Create pending invite
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: studio.id,
        user_id: existingUser.id,
        role: 'editor',
        status: 'pending',
        invited_by: user?.id
      });

    if (!error) {
      await loadData();
      setShowInviteDialog(false);
      setInviteEmail('');
      toast.success('Invite sent successfully!');
    } else {
      toast.error('Failed to send invite: ' + error.message);
    }
    
    setInviting(false);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setShowRemoveDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setRemoving(memberToRemove.id);
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberToRemove.id);

    if (!error) {
      await loadData();
      toast.success('Member removed successfully!');
    } else {
      toast.error('Failed to remove member');
    }
    
    setRemoving(null);
    setShowRemoveDialog(false);
    setMemberToRemove(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studio) return;

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${studio.id}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-assets')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('studio-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", studio.id);

      if (!updateError) {
        setStudio({ ...studio, logo_url: publicUrl });
        toast.success('Studio logo updated successfully!');
      } else {
        toast.error('Failed to update studio logo');
      }
    } else {
      toast.error('Failed to upload studio logo');
    }
    
    setUploading(false);
  };

  const handleDeleteStudio = async () => {
    if (deleteConfirmText !== "DELETE" || !studio) return;

    setDeleting(true);
    try {
      // Delete the studio
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", studio.id);

      if (error) throw error;

      toast.success("Studio deleted successfully");
      
      // Redirect to hub
      router.push("/hub");
    } catch (error: any) {
      console.error("Error deleting studio:", error);
      toast.error("Failed to delete studio");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  const getCurrentUserMembership = () => {
    if (!user || !members) return null;
    return members.find((m: any) => m.user?.id === user.id);
  };

  const isCurrentUserOwner = () => {
    const membership = getCurrentUserMembership();
    return membership?.role === 'owner';
  };

  const handleInitiateTransfer = async () => {
    if (!transferEmail || !studio || !user) return;
    
    setTransferring(true);
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', transferEmail)
      .single();

    if (!existingUser) {
      toast.error('User not found. They need to sign up first.');
      setTransferring(false);
      return;
    }

    // Check if trying to transfer to self
    if (existingUser.id === user.id) {
      toast.error('You cannot transfer ownership to yourself.');
      setTransferring(false);
      return;
    }

    // Check if already a member or has pending invite
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('status, is_transfer')
      .eq('organization_id', studio.id)
      .eq('user_id', existingUser.id)
      .single();

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        toast.error('This user is already a member. Remove them first, then send a transfer invite.');
        setTransferring(false);
        return;
      }
      if (existingMembership.is_transfer) {
        toast.error('A transfer request is already pending for this user.');
        setTransferring(false);
        return;
      }
      toast.error('This user already has a pending invite.');
      setTransferring(false);
      return;
    }

    // Create transfer invite
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: studio.id,
        user_id: existingUser.id,
        role: 'owner', // They will become owner when they accept
        status: 'pending',
        is_transfer: true,
        invited_by: user.id
      });

    if (error) {
      console.error('Error creating transfer invite:', error);
      toast.error('Failed to send transfer invite');
    } else {
      toast.success(`Transfer invite sent to ${existingUser.email}`);
      setShowTransferDialog(false);
      setTransferEmail("");
    }
    
    setTransferring(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen py-8 px-4">
      <div className="w-full max-w-7xl">{/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your studio settings and team members
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        router.push(`/studio/${studioSlug}/settings?tab=${value}`, { scroll: false });
      }} className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="studio" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <Users className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Studio Settings */}
        <TabsContent value="studio" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Studio Profile</h3>
              
              {/* Logo Upload */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
                  {studio?.logo_url ? (
                    <img src={studio.logo_url} alt={studio.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{name?.[0] || 'S'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold mb-2">{name || 'Studio Name'}</div>
                  <div className="space-y-2">
                    <label htmlFor="logo-upload">
                      <Button variant="outline" className="gap-2" disabled={uploading} asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          {uploading ? 'Uploading...' : 'Upload Logo'}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground">
                      Recommended: 256x256px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Studio Name */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Studio Name</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass max-w-md"
                />
              </div>

              {/* Studio Slug */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Studio URL</label>
                <div className="flex items-center gap-2 max-w-md">
                  <span className="text-sm text-muted-foreground">/studio/</span>
                  <Input 
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="glass"
                  />
                </div>
              </div>


            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="glow-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Transfer Ownership Section - Only visible to owner */}
          {isCurrentUserOwner() && (
            <div className="glass-card p-6 border-amber-500/20">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-500">Transfer Ownership</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send an ownership transfer invite to another user. They can accept or decline the transfer.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the email address of the user you want to transfer ownership to. They must have an account.
                </p>
                <Button 
                  variant="outline" 
                  className="gap-2 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => setShowTransferDialog(true)}
                >
                  <Crown className="w-4 h-4" />
                  Initiate Transfer
                </Button>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="glass-card p-6 border-red-500/20">
            <h3 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your studio is permanent and cannot be undone. All projects,
              documents, and data will be lost.
            </p>
            <Button variant="destructive" className="gap-2" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4" />
              Delete Studio
            </Button>
          </div>
        </TabsContent>

        {/* Personal Settings */}
        <TabsContent value="personal" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Profile</h3>
              
              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" className="gap-2" disabled={uploadingAvatar} asChild>
                      <span>
                        <Upload className="w-4 h-4" />
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
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
                <label className="text-sm font-medium">Email</label>
                <Input 
                  value={user?.email || ''}
                  disabled
                  className="glass max-w-md bg-white/5"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveDisplayName} disabled={saving} className="glow-sm">
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>

          {/* Password Section */}
          <div className="glass-card p-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Password</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send a password reset email to {user?.email}
              </p>
              <Button 
                onClick={handleSendPasswordReset} 
                disabled={sendingPasswordReset}
                variant="outline"
              >
                {sendingPasswordReset ? 'Sending...' : 'Send Password Reset Email'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  {members.length} / {getMemberLimit()} members {subscription?.plan ? `(${subscription.plan} plan)` : ''}
                </p>
              </div>
              <Button 
                className="gap-2" 
                onClick={() => setShowInviteDialog(true)}
                disabled={!canAddMember()}
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>

            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member: any) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {(member.user as any)?.avatar_url ? (
                          <img src={(member.user as any).avatar_url} alt={(member.user as any).full_name || (member.user as any).email} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-sm font-medium">
                            {(member.user as any)?.email?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{(member.user as any)?.full_name || (member.user as any)?.email}</p>
                        <p className="text-sm text-muted-foreground">{(member.user as any)?.email}</p>
                        {member.joined_at && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {member.status === 'pending' ? 'Invited' : 'Joined'} {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm capitalize px-3 py-1 rounded-full ${
                        member.status === 'pending' 
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                          : 'text-muted-foreground bg-white/5'
                      }`}>
                        {member.status === 'pending' ? 'Invited' : (member.role === 'owner' ? 'Owner' : 'Member')}
                      </span>
                      {member.role !== 'owner' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, (member.user as any)?.full_name || (member.user as any)?.email)}
                          disabled={removing === member.id}
                        >
                          {removing === member.id ? 'Removing...' : 'Remove'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Invite collaborators to work together
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <BillingTab subscription={subscription} studioId={studio?.id} />
        </TabsContent>
      </Tabs>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                The user must already have an account to be added.
              </p>
            </div>
            {!canAddMember() && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-500">
                  You've reached the member limit for your {subscription?.plan || 'free'} plan. 
                  Upgrade to add more members.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember} 
              disabled={!inviteEmail || inviting || !canAddMember()}
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to remove <span className="font-semibold">{memberToRemove?.name}</span> from the studio? They will lose access immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveMember} 
              disabled={removing !== null}
            >
              {removing !== null ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Studio Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Studio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              This action <span className="font-semibold text-red-500">cannot be undone</span>. 
              This will permanently delete the studio, all projects, documents, and data.
            </p>
            <p className="text-sm text-muted-foreground">
              Please type <span className="font-mono font-semibold">DELETE</span> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setDeleteConfirmText("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteStudio} 
              disabled={deleteConfirmText !== "DELETE" || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Studio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Transfer Ownership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Send an ownership transfer invite for <span className="font-semibold">{studio?.name}</span>.
            </p>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-600 font-medium">
                ⚠️ Important
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The recipient can accept or decline this transfer. If they accept, you will become a regular member and they will have full control of the studio, including the ability to remove you.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="newowner@example.com"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                The user must already have an account to receive the transfer.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTransferDialog(false);
              setTransferEmail("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleInitiateTransfer} 
              disabled={!transferEmail || transferring}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {transferring ? 'Sending...' : 'Send Transfer Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}