"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Play, Users, FolderKanban, Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { CreateStudioDialog } from "./create-studio-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Studio {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  memberCount?: number;
  projectCount?: number;
}

interface PendingInvite {
  id: string;
  organization_id: string;
  organization: {
    name: string;
    slug: string;
    logo_url?: string;
  };
  invited_by_profile?: {
    full_name?: string;
    email: string;
  };
  joined_at: string;
}

export default function HubPage() {
  const [user, setUser] = useState<any>(null);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Get user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Get user profile with invite preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("accept_invites")
      .eq("id", currentUser.id)
      .single();

    if (profile) {
      setAcceptInvites(profile.accept_invites ?? true);
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
          logo_url
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

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo_url: org.logo_url,
            memberCount: memberCount || 1,
            projectCount: projectCount || 0,
          };
        })
      );
      setStudios(studioData);
    }

    // Get pending invites
    const { data: pendingData } = await supabase
      .from("organization_members")
      .select(`
        id,
        organization_id,
        joined_at,
        organizations!inner (
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

  async function toggleAcceptInvites(enabled: boolean) {
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
  }

  async function handleInviteResponse(inviteId: string, accept: boolean) {
    if (accept) {
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
    } else {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", inviteId);

      if (error) {
        toast.error("Failed to decline invite");
      } else {
        toast.success("Invite declined");
        loadData();
      }
    }
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
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/hub" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-semibold text-lg">YouTuber Studio</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {/* Accept Invites Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="accept-invites">
                Accept Invites
              </label>
              <Switch
                id="accept-invites"
                checked={acceptInvites}
                onCheckedChange={toggleAcceptInvites}
              />
            </div>
            
            <span className="text-sm text-muted-foreground">{user?.email || "preview@example.com"}</span>
            <form action="/auth/sign-out" method="post">
              <Button variant="ghost" size="sm">Sign Out</Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Studios</h1>
            <p className="text-muted-foreground mt-1">
              Manage your YouTube channels and projects
            </p>
          </div>
          <CreateStudioDialog />
        </div>

        {/* Studios Grid or Empty State */}
        {studios.length === 0 && pendingInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6">
              <FolderKanban className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No studios yet</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Studios */}
            {studios.map((studio) => (
              <Link
                key={studio.id}
                href={`/studio/${studio.slug}/projects`}
                className="glass-card p-6 hover-lift group"
              >
                <div className="flex items-start gap-4">
                  {studio.logo_url ? (
                    <img 
                      src={studio.logo_url} 
                      alt={studio.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-lg font-bold">{studio.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                      {studio.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {studio.memberCount || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-4 h-4" />
                        {studio.projectCount || 0} projects
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* Pending Invites */}
            {pendingInvites.map((invite) => {
              if (!invite.organization) return null;
              
              return (
                <div key={invite.id} className="glass-card p-6 relative border-2 border-amber-500/30">
                  <Badge className="absolute top-3 right-3 bg-amber-500/20 text-amber-600 border-amber-500/30">
                    <Bell className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                  <div className="flex items-start gap-4 mb-4">
                    {invite.organization.logo_url ? (
                      <img
                        src={invite.organization.logo_url}
                        alt={invite.organization.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold">{invite.organization.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {invite.organization.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Invited by {invite.invited_by_profile?.full_name || invite.invited_by_profile?.email || "someone"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleInviteResponse(invite.id, true)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleInviteResponse(invite.id, false)}
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
    </div>
  );
}
