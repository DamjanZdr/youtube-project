"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/shared/create-project-dialog";
import { Plus, Video, Clock, TrendingUp, Youtube } from "lucide-react";
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
  name: string;
  color: string;
}

// Format subscriber count with commas (e.g., 6,900,000)
function formatSubscriberCount(count: number): string {
  return count.toLocaleString();
}

export default function StudioHomePage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;
  const supabase = createClient();

  const [studio, setStudio] = useState<{ id: string; name: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boardStatuses, setBoardStatuses] = useState<BoardStatus[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      // Fetch user data
      const { data: { user: userData } } = await supabase.auth.getUser();
      if (userData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userData.id)
          .single();
        
        setUser(profile);
      }

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
        .select("id, position, name, color")
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

      // Fetch subscriber count - first from DB, then try to sync live from YouTube
      const { data: channelsForCount } = await supabase
        .from("channels")
        .select("subscriber_count")
        .eq("organization_id", studioData?.id)
        .limit(1);

      setSubscriberCount(channelsForCount?.[0]?.subscriber_count || 0);

      // Try to fetch live stats from YouTube if connected
      try {
        const response = await fetch(`/api/youtube/stats?organizationId=${studioData?.id}`);
        if (response.ok) {
          const stats = await response.json();
          if (stats.subscriberCount) {
            setSubscriberCount(stats.subscriberCount);
          }
        }
      } catch (e) {
        // YouTube not connected or error - use cached value
      }
    }

    loadData();
  }, [studioSlug]);

  async function createProject(data: { title: string; description: string; videoType: "long" | "short" }) {
    if (!studio) return;

    // Check project limit before attempting to create
    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", studio.id);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("organization_id", studio.id)
      .single();

    const plan = sub?.plan || "free";
    const limits: Record<string, number> = { free: 1, creator: -1, studio: -1, agency: -1 };
    const limit = limits[plan] ?? 1;

    if (limit !== -1 && (projectCount ?? 0) >= limit) {
      throw new Error(`Project limit reached for ${plan} plan (${limit} projects). Upgrade to create more projects.`);
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
          <h1 className="text-2xl font-bold">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}!</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with {studio?.name || "your studio"}</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Subscriber Count - Featured */}
        <div className="glass-card p-5 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatSubscriberCount(subscriberCount)}</p>
              <p className="text-sm text-muted-foreground">Subscribers</p>
            </div>
          </div>
        </div>

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

      {/* Content Pipeline */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Content Pipeline</h2>
        <div className="flex gap-2">
          {boardStatuses.map((status) => {
            const count = projects?.filter(p => p.board_status_id === status.id).length || 0;
            return (
              <div key={status.id} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${status.color} mb-2`} />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{status.name}</p>
              </div>
            );
          })}
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