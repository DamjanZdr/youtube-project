"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Play, Users, FolderKanban, Bell, Check, X, Youtube, Shield, CreditCard, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateStudioDialog } from "./create-studio-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import { plans } from "@/config/subscriptions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Studio {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  status?: 'pending' | 'active';
  memberCount?: number;
  projectCount?: number;
  subscriberCount?: number;
  plan?: string;
  checkout_plan?: string;
}

interface PendingInvite {
  id: string;
  organization_id: string;
  is_transfer?: boolean;
  organization?: {
    name: string;
    slug: string;
    logo_url?: string;
  };
  organizations?: Array<{
    name: string;
    slug: string;
    logo_url?: string;
  }>;
  invited_by_profile?: {
    full_name?: string;
    email: string;
  };
  joined_at: string;
}

// Format subscriber count with commas (e.g., 6,900,000)
function formatSubscriberCount(count: number): string {
  return count.toLocaleString();
}

export default function HubPage() {
  const [user, setUser] = useState<any>(null);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cancelStudioId, setCancelStudioId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Get user
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Get user profile with invite preference and display info
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, accept_invites, role")
      .eq("id", currentUser.id)
      .single();

    if (profile) {
      setUser(profile);
      setAcceptInvites(profile.accept_invites ?? true);
      setIsAdmin(profile.role === "admin");
    } else {
      // Fallback to auth user if profile not found
      setUser({
        id: currentUser.id,
        email: currentUser.email,
      });
    }

    // Get active studios
    const { data: activeMembers } = await supabase
      .from("organization_members")
      .select(`
        organization_id,
        organizations!inner (
          id,
          name,
          slug,
          logo_url,
          status,
          checkout_plan
        )
      `)
      .eq("user_id", currentUser.id)
      .eq("status", "active");

    if (activeMembers) {
      const studioData = await Promise.all(
        activeMembers.map(async (member: any) => {
          const org = member.organizations;
          
          // Get member count
          const { count: memberCount } = await supabase
            .from("organization_members")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
            .eq("status", "active");

          // Get project count
          const { count: projectCount } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          // Get subscription plan
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("organization_id", org.id)
            .single();

          // Subscriber count disabled while YouTube connection is off
          const subscriberCount = 0;

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo_url: org.logo_url,
            status: org.status || 'active',
            memberCount: memberCount || 1,
            projectCount: projectCount || 0,
            subscriberCount,
            plan: subscription?.plan || 'free',
            checkout_plan: org.checkout_plan,
          };
        })
      );
      setStudios(studioData);
    }

    // Get pending invites
    const { data: pendingData, error: pendingError } = await supabase
      .from("organization_members")
      .select(`
        id,
        organization_id,
        joined_at,
        is_transfer,
        organizations!organization_members_organization_id_fkey (
          name,
          slug,
          logo_url
        ),
        invited_by_profile:profiles!organization_members_invited_by_fkey (
          full_name,
          email
        )
      `)
      .eq("user_id", currentUser.id)
      .eq("status", "pending");

    if (pendingData) {
      setPendingInvites(pendingData as any);
    }

    setLoading(false);
  }

  async function handleInviteResponse(inviteId: string, accept: boolean, isTransfer: boolean = false) {
    if (accept) {
      if (isTransfer) {
        // Use security definer function for transfer acceptance
        const { data, error } = await supabase
          .rpc('accept_ownership_transfer', { invite_id: inviteId });

        if (error || !data?.success) {
          toast.error(data?.error || error?.message || "Failed to accept transfer");
        } else {
          toast.success("Ownership transferred successfully!");
          loadData();
        }
      } else {
        // Regular invite acceptance
        const { error } = await supabase
          .from("organization_members")
          .update({ status: "active" })
          .eq("id", inviteId);

        if (error) {
          toast.error("Failed to accept invite");
        } else {
          toast.success("Invite accepted!");
          loadData();
        }
      }
    } else {
      // Decline invite (same for both regular and transfer)
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", inviteId);

      if (error) {
        toast.error("Failed to decline invite");
      } else {
        toast.success(isTransfer ? "Transfer declined" : "Invite declined");
        loadData();
      }
    }
  }

  async function handleCancelPendingStudio() {
    if (!cancelStudioId) return;

    // Delete the pending organization and all related data
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", cancelStudioId)
      .eq("status", "pending");

    if (error) {
      toast.error("Failed to cancel studio");
      console.error("Cancel pending studio error:", error);
    } else {
      toast.success("Pending studio cancelled");
      loadData();
    }
    setCancelStudioId(null);
  }

  function handleResumeCheckout(studio: Studio) {
    // Get the plan config - use checkout_plan for pending studios
    const planId = studio.checkout_plan || studio.plan;
    const planConfig = plans.find(p => p.id === planId);
    if (!planConfig || !planConfig.stripePriceId.monthly) {
      toast.error("Could not find plan configuration");
      return;
    }

    // Set checkout params in sessionStorage
    sessionStorage.setItem("checkoutParams", JSON.stringify({
      organizationId: studio.id,
      priceId: planConfig.stripePriceId.monthly, // Default to monthly
    }));

    // Navigate to checkout
    router.push(`/studio/${studio.slug}/checkout`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Top Bar - Bottom on mobile, top on desktop */}
      <header className="fixed bottom-0 md:sticky md:top-0 md:bottom-auto left-0 right-0 z-50 glass-strong border-t md:border-t-0 md:border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          
          <div className="flex items-center gap-3 md:gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 px-3 md:px-3 h-10 md:h-9">
                      <Shield className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <UserProfileDropdown 
                  user={user} 
                  initialAcceptInvites={acceptInvites} 
                />
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="h-10 md:h-9">Login</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm" className="h-10 md:h-9">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Not logged in state */}
      {!user ? (
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl glass flex items-center justify-center mb-4 md:mb-6">
              <FolderKanban className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mb-2">You're not logged in</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mb-4 md:mb-6 px-4">
              To create a studio and manage your YouTube projects, you need to log in or create an account.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="outline" size="lg">Login</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="lg" className="glow-primary">Register</Button>
              </Link>
            </div>
          </div>
        </main>
      ) : (
      /* Main Content */
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your Studios</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage your YouTube channels and projects
            </p>
          </div>
          <CreateStudioDialog />
        </div>

        {/* Studios Grid or Empty State */}
        {studios.length === 0 && pendingInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl glass flex items-center justify-center mb-4 md:mb-6">
              <FolderKanban className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold mb-2">No studios yet</h2>
            <p className="text-sm md:text-base text-muted-foreground text-center max-w-md mb-4 md:mb-6 px-4">
              Create your first studio to start managing your YouTube channel,
              projects, and content workflow.
            </p>
            <CreateStudioDialog 
              trigger={
                <Button className="glow-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Studio
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Active Studios */}
            {studios.map((studio) => {
              // Pending studios need different rendering
              if (studio.status === 'pending') {
                return (
                  <div key={studio.id} className="glass-card p-4 md:p-6 relative border-2 border-yellow-500/30">
                    <Badge className="absolute top-2 right-2 md:top-3 md:right-3 text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Pending Payment
                    </Badge>
                    <div className="flex items-start gap-3 md:gap-4 mb-4">
                      {studio.logo_url ? (
                        <img 
                          src={studio.logo_url} 
                          alt={studio.name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover opacity-60"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center opacity-60">
                          <span className="text-base md:text-lg font-bold">{studio.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-16 md:pr-28">
                        <h3 className="font-semibold text-base md:text-lg truncate text-muted-foreground">
                          {studio.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Complete payment to activate
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handleResumeCheckout(studio)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Complete Setup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => setCancelStudioId(studio.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              }
              
              // Active studios render as links
              return (
                <Link
                  key={studio.id}
                  href={`/studio/${studio.slug}`}
                  className="glass-card p-4 md:p-6 hover-lift group"
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {studio.logo_url ? (
                      <img 
                        src={studio.logo_url} 
                        alt={studio.name}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-base md:text-lg font-bold">{studio.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base md:text-lg truncate group-hover:text-primary transition-colors">
                          {studio.name}
                        </h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                          studio.plan === 'enterprise' ? 'border-amber-500/50 text-amber-400' :
                          studio.plan === 'studio' ? 'border-purple-500/50 text-purple-400' :
                          studio.plan === 'creator' ? 'border-blue-500/50 text-blue-400' :
                          'border-white/20 text-muted-foreground'
                        }`}>
                          {studio.plan === 'enterprise' ? 'Enterprise' : studio.plan === 'studio' ? 'Studio' : studio.plan === 'creator' ? 'Creator' : 'Free'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {studio.memberCount || 1}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-4 h-4" />
                          {studio.projectCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {/* Pending Invites */}
            {pendingInvites.map((invite) => {
              // Handle both array and object formats from Supabase
              const org = Array.isArray(invite.organizations) 
                ? invite.organizations[0] 
                : invite.organizations;
              
              if (!org) return null;

              const isTransfer = invite.is_transfer === true;
              
              return (
                <div key={invite.id} className={`glass-card p-4 md:p-6 relative border-2 ${isTransfer ? 'border-amber-500/50' : 'border-amber-500/30'}`}>
                  <Badge className={`absolute top-2 right-2 md:top-3 md:right-3 text-xs ${isTransfer ? 'bg-amber-500/30 text-amber-600 border-amber-500/50' : 'bg-amber-500/20 text-amber-600 border-amber-500/30'}`}>
                    <Bell className="w-3 h-3 mr-1" />
                    {isTransfer ? 'Transfer' : 'Pending'}
                  </Badge>
                  <div className="flex items-start gap-3 md:gap-4 mb-4">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-base md:text-lg font-bold">{org.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-16 md:pr-20">
                      <h3 className="font-semibold text-base md:text-lg truncate">
                        {org.name}
                      </h3>
                      {isTransfer ? (
                        <p className="text-sm text-amber-600 font-medium mt-1">
                          Ownership Transfer Request
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          Invited by {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "someone"}
                        </p>
                      )}
                      {isTransfer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          From {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "current owner"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleInviteResponse(invite.id, true, isTransfer)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleInviteResponse(invite.id, false, isTransfer)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      )}

      {/* Cancel Studio Confirmation Dialog */}
      <AlertDialog open={!!cancelStudioId} onOpenChange={(open) => !open && setCancelStudioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Studio</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this studio? This will permanently delete the pending studio and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Studio</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPendingStudio}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Studio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
