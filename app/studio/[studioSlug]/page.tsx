"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/shared/create-project-dialog";
import { Plus, Video, Clock, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Project {
  id: string;
  status: string;
  title: string;
  updated_at: string;
  video_type: "long" | "short";
  board_status_id: string | null;
}

interface BoardStatus {
  id: string;
  position: number;
}

export default function StudioHomePage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;
  const supabase = createClient();

  const [studio, setStudio] = useState<{ id: string; name: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boardStatuses, setBoardStatuses] = useState<BoardStatus[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    async function loadData() {
      // Fetch studio data
      const { data: studioData } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("slug", studioSlug)
        .single();

      setStudio(studioData);

      // Fetch board statuses
      const { data: statusData } = await supabase
        .from("board_statuses")
        .select("id, position")
        .eq("organization_id", studioData?.id)
        .order("position", { ascending: true });

      setBoardStatuses(statusData || []);

      // Fetch project data
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, status, title, updated_at, video_type, board_status_id")
        .eq("organization_id", studioData?.id)
        .order("updated_at", { ascending: false })
        .limit(5);

      setProjects(projectData || []);
    }

    loadData();
  }, [studioSlug]);

  async function createProject(data: { title: string; description: string; videoType: "long" | "short" }) {
    if (!studio) return;

    // Get or create default channel
    let { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("organization_id", studio.id)
      .eq("is_default", true)
      .single();

    if (!channel) {
      const { data: newChannel, error: channelError } = await supabase
        .from("channels")
        .insert({
          organization_id: studio.id,
          name: "Main Channel",
          is_default: true,
        })
        .select("id")
        .single();

      if (channelError) throw channelError;
      channel = newChannel;
    }

    // Get the first board status to assign
    const { data: firstStatus } = await supabase
      .from("board_statuses")
      .select("id")
      .eq("organization_id", studio.id)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    // Create the project
    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        title: data.title,
        description: data.description || null,
        organization_id: studio.id,
        channel_id: channel.id,
        video_type: data.videoType,
        board_status_id: firstStatus?.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    toast.success("Project created successfully!");
    
    // Navigate to the project
    router.push(`/studio/${studioSlug}/project/${newProject.id}`);
  }

  // Find the last board status (highest position)
  const lastStatusId = boardStatuses.length > 0 
    ? boardStatuses[boardStatuses.length - 1].id 
    : null;

  const totalProjects = projects?.length || 0;
  const completedProjects = projects?.filter(p => p.board_status_id === lastStatusId).length || 0;
  const inProgressProjects = totalProjects - completedProjects;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with {studio?.name || "your studio"}</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProjects}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressProjects}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedProjects}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
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
          <div className="grid grid-cols-2 gap-6">
            {/* Long-form videos - Left column */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Long-form</h3>
              {projects.filter(p => p.video_type === "long").length > 0 ? (
                projects.filter(p => p.video_type === "long").map((project) => (
                  <a key={project.id} href={`/studio/${studioSlug}/project/${project.id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
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
                  </a>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No long-form videos</p>
              )}
            </div>

            {/* Shorts - Right column */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Shorts</h3>
              {projects.filter(p => p.video_type === "short").length > 0 ? (
                projects.filter(p => p.video_type === "short").map((project) => (
                  <a key={project.id} href={`/studio/${studioSlug}/project/${project.id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
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
                  </a>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No shorts</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No projects yet. Start creating!</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={createProject}
      />
    </div>
  );
}