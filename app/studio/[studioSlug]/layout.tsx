import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { StudioSidebar } from "./studio-sidebar";
import { StudioTutorial } from "@/components/shared/studio-tutorial";
import { updateUserActivity, updateOrgActivity } from "@/lib/actions/activity";

interface StudioLayoutProps {
  children: React.ReactNode;
  params: Promise<{ studioSlug: string }>;
}

export default async function StudioLayout({ children, params }: StudioLayoutProps) {
  const { studioSlug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, accept_invites")
    .eq("id", user.id)
    .single();

  // Fetch studio data
  const { data: studio, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, owner_id")
    .eq("slug", studioSlug)
    .single();

  if (error || !studio) {
    console.error("Studio not found:", error);
    notFound();
  }

  // Verify user has access (is owner or member)
  const isOwner = studio.owner_id === user.id;
  
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", studio.id)
      .eq("user_id", user.id)
      .single();
    
    if (!membership) {
      redirect("/hub");
    }
  }

  // Fetch tutorial progress
  const { data: memberData } = await supabase
    .from("organization_members")
    .select("tutorial_step")
    .eq("organization_id", studio.id)
    .eq("user_id", user.id)
    .single();

  // Tutorial step: null = never started (show welcome), number = current step
  const tutorialStep = memberData?.tutorial_step ?? null;

  // Track activity (non-blocking)
  updateUserActivity().catch(() => {});
  updateOrgActivity(studio.id).catch(() => {});

  return (
    <TooltipProvider>
      <div className="h-[100dvh] bg-background flex flex-col md:flex-row overflow-hidden">
        {/* Client-side collapsible sidebar */}
        <StudioSidebar 
          studio={{ name: studio.name, logo_url: studio.logo_url }}
          user={{ 
            id: user.id,
            email: user.email ?? null, 
            avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
            full_name: profile?.full_name || user.user_metadata?.full_name,
            accept_invites: profile?.accept_invites ?? true
          }}
          studioSlug={studioSlug}
        />

        {/* Main Content - pb-[72px] for mobile bottom nav (h-18) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[72px] md:pb-0">
          {children}
        </main>

        {/* Onboarding Tutorial */}
        <StudioTutorial
          studioSlug={studioSlug}
          organizationId={studio.id}
          userId={user.id}
          initialStep={tutorialStep}
        />
      </div>
    </TooltipProvider>
  );
}