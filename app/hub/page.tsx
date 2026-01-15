import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Play, Users, FolderKanban } from "lucide-react";
import Link from "next/link";
import { getStudios } from "@/lib/actions/studio";
import { CreateStudioDialog } from "./create-studio-dialog";

export default async function HubPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Auth check disabled for preview
  // if (!user) {
  //   redirect("/auth/login");
  // }

  // Fetch user studios from database
  const studios = await getStudios();

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
          
          <div className="flex items-center gap-4">
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
        {studios.length === 0 ? (
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
            {studios.map((studio: any) => (
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
          </div>
        )}
      </main>
    </div>
  );
}