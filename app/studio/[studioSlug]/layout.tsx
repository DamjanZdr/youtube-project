import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { StudioSidebar } from "./studio-sidebar";

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
    .select("full_name, avatar_url")
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Client-side collapsible sidebar */}
        <StudioSidebar 
          studio={{ name: studio.name, logo_url: studio.logo_url }}
          user={{ 
            email: user.email ?? null, 
            avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
            full_name: profile?.full_name || user.user_metadata?.full_name
          }}
          studioSlug={studioSlug}
        />

        {/* Main Content - margin handled by sidebar component */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}