import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Video, Clock, TrendingUp, Calendar } from "lucide-react";

interface StudioPageProps {
  params: Promise<{ studioSlug: string }>;
}

export default async function StudioHomePage({ params }: StudioPageProps) {
  const { studioSlug } = await params;
  const supabase = await createClient();

  // Fetch studio data
  const { data: studio } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", studioSlug)
    .single();

  // Fetch project counts by status
  const { data: projects } = await supabase
    .from("projects")
    .select("id, status, title, updated_at")
    .eq("organization_id", studio?.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  const statusCounts = {
    idea: projects?.filter(p => p.status === "idea").length || 0,
    script: projects?.filter(p => p.status === "script").length || 0,
    recording: projects?.filter(p => p.status === "recording").length || 0,
    editing: projects?.filter(p => p.status === "editing").length || 0,
    scheduled: projects?.filter(p => p.status === "scheduled").length || 0,
    published: projects?.filter(p => p.status === "published").length || 0,
  };

  const totalProjects = projects?.length || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with {studio?.name || "your studio"}</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProjects}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.editing + statusCounts.recording}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.scheduled}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.published}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Content Pipeline</h2>
        <div className="flex gap-2">
          {[
            { label: "Ideas", count: statusCounts.idea, color: "bg-gray-500" },
            { label: "Script", count: statusCounts.script, color: "bg-blue-500" },
            { label: "Recording", count: statusCounts.recording, color: "bg-yellow-500" },
            { label: "Editing", count: statusCounts.editing, color: "bg-orange-500" },
            { label: "Scheduled", count: statusCounts.scheduled, color: "bg-purple-500" },
            { label: "Published", count: statusCounts.published, color: "bg-green-500" },
          ].map((stage) => (
            <div key={stage.label} className="flex-1 text-center">
              <div className={`h-2 rounded-full ${stage.color} mb-2`} />
              <p className="text-xl font-bold">{stage.count}</p>
              <p className="text-xs text-muted-foreground">{stage.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/studio/${studioSlug}/projects`}>View all</a>
          </Button>
        </div>
        
        {projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{project.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{project.status}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  project.status === "published" ? "bg-green-500/20 text-green-400" :
                  project.status === "scheduled" ? "bg-purple-500/20 text-purple-400" :
                  project.status === "editing" ? "bg-orange-500/20 text-orange-400" :
                  project.status === "recording" ? "bg-yellow-500/20 text-yellow-400" :
                  project.status === "script" ? "bg-blue-500/20 text-blue-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No projects yet. Start creating!</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}