"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/shared/create-project-dialog";
import Link from "next/link";
import {
  Plus,
  FolderKanban,
  Calendar,
  MoreHorizontal,
  Lightbulb,
  FileText,
  Video,
  Scissors,
  Clock,
  CheckCircle2,
  Grid3X3,
  List,
  Search,
  Tv,
  Film,
  Trash2,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";

// Status configuration with colors and icons
const STATUS_CONFIG = {
  idea: { label: "Idea", color: "bg-purple-500", icon: Lightbulb, description: "Initial concept" },
  script: { label: "Script", color: "bg-blue-500", icon: FileText, description: "Writing script" },
  recording: { label: "Recording", color: "bg-yellow-500", icon: Video, description: "Filming content" },
  editing: { label: "Editing", color: "bg-orange-500", icon: Scissors, description: "Post-production" },
  scheduled: { label: "Scheduled", color: "bg-cyan-500", icon: Clock, description: "Ready to publish" },
  published: { label: "Published", color: "bg-green-500", icon: CheckCircle2, description: "Live on YouTube" },
};

type ProjectStatus = keyof typeof STATUS_CONFIG;
type ViewMode = "grid" | "list";

interface BoardStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  video_type: "long" | "short";
  thumbnail_url: string | null;
  due_date: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  board_status_id: string | null;
  // Active set data
  active_set_title?: string | null;
  active_set_thumbnail?: string | null;
}

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [boardStatuses, setBoardStatuses] = useState<BoardStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "long" | "short">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, [studioSlug]);

  const fetchProjects = async () => {
    setLoading(true);
    const supabase = createClient();

    // First get the organization ID from slug
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    // Fetch board statuses
    const { data: statusData } = await supabase
      .from("board_statuses")
      .select("id, name, color, position")
      .eq("organization_id", org.id)
      .order("position", { ascending: true });

    setBoardStatuses(statusData || []);

    // Fetch projects for this organization with active packaging set
    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        packaging_sets!left (
          title,
          thumbnail_url,
          is_selected
        )
      `)
      .eq("organization_id", org.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
    } else {
      // Map projects to include active set data
      const projectsWithActiveSet = (data || []).map((project: any) => {
        const activeSet = project.packaging_sets?.find((s: any) => s.is_selected);
        return {
          ...project,
          active_set_title: activeSet?.title || null,
          active_set_thumbnail: activeSet?.thumbnail_url || null,
          packaging_sets: undefined, // Remove from object
        };
      });
      setProjects(projectsWithActiveSet);
    }
    setLoading(false);
  };

  // Create new project
  const handleCreateProject = async (data: { title: string; description: string; videoType: "long" | "short" }) => {
    const supabase = createClient();

    // Get org and channel
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();

    if (!org) {
      return;
    }

    // Get or create default channel
    let { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("organization_id", org.id)
      .single();

    if (!channel) {
      const { data: newChannel } = await supabase
        .from("channels")
        .insert({ organization_id: org.id, name: "Main Channel" })
        .select("id")
        .single();
      channel = newChannel;
    }

    if (!channel) {
      return;
    }

    // Get the first board status (default to first status column)
    const { data: firstStatus } = await supabase
      .from("board_statuses")
      .select("id")
      .eq("organization_id", org.id)
      .order("position")
      .limit(1)
      .single();

    // Create project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        organization_id: org.id,
        channel_id: channel.id,
        title: data.title,
        description: data.description || null,
        video_type: data.videoType,
        status: "idea",
        board_status_id: firstStatus?.id || null, // Set board status to trigger default tasks
      })
      .select()
      .single();

    if (error) {
      throw error;
    } else if (project) {
      setProjects([project, ...projects]);
      // Navigate to the new project
      router.push(`/studio/${studioSlug}/project/${project.id}`);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatusIds.length === 0 || selectedStatusIds.includes(project.board_status_id || "");
    const matchesType = typeFilter === "all" || project.video_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Toggle status filter
  const toggleStatusFilter = (statusId: string) => {
    setSelectedStatusIds(prev => 
      prev.includes(statusId) 
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const getStatusConfig = (status: string) => STATUS_CONFIG[status as ProjectStatus] || STATUS_CONFIG.idea;

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your video projects and content pipeline</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="glow-sm gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Content Pipeline */}
      {projects.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Content Pipeline</h2>
          <div className="flex gap-2">
            {boardStatuses.map((status) => {
              const count = projects.filter(p => p.board_status_id === status.id).length;
              const isSelected = selectedStatusIds.includes(status.id);
              return (
                <div 
                  key={status.id} 
                  className={`flex-1 text-center cursor-pointer transition-all rounded-lg p-2 ${
                    isSelected ? "bg-white/10 ring-2 ring-white/20" : "hover:bg-white/5"
                  }`}
                  onClick={() => toggleStatusFilter(status.id)}
                >
                  <div className={`h-2 rounded-full ${status.color} mb-2`} />
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{status.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {projects.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none w-64 text-sm"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 glass rounded-lg p-1">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  typeFilter === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter("long")}
                className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1.5 ${
                  typeFilter === "long" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Long
              </button>
              <button
                onClick={() => setTypeFilter("short")}
                className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1.5 ${
                  typeFilter === "short" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                Short
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 glass rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "grid" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "list" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="aspect-video rounded-xl bg-white/5 mb-4" />
              <div className="h-5 rounded bg-white/10 w-3/4 mb-2" />
              <div className="h-4 rounded bg-white/5 w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center mb-6">
            <FolderKanban className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Start Your First Video</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Every great video starts with an idea. Create your first project and bring your vision to life.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="glow-primary gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Project
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* No Results */
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects found</h2>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} studioSlug={studioSlug} boardStatuses={boardStatuses} />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} studioSlug={studioSlug} boardStatuses={boardStatuses} />
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, studioSlug, boardStatuses }: { project: Project; studioSlug: string; boardStatuses: BoardStatus[] }) {
  // Find the actual board status for this project
  const boardStatus = boardStatuses.find(s => s.id === project.board_status_id);
  const statusName = boardStatus?.name || "Unknown";
  const statusColor = boardStatus?.color || "bg-gray-500";
  
  // Use active set data if available, otherwise fall back to project data
  const displayTitle = project.active_set_title || project.title;
  const displayThumbnail = project.active_set_thumbnail || project.thumbnail_url;

  return (
    <Link
      href={`/studio/${studioSlug}/project/${project.id}`}
      className="glass-card p-4 hover-lift group block"
    >
      {/* Thumbnail */}
      <div className="aspect-video rounded-xl bg-gradient-to-br from-white/5 to-white/10 mb-3 overflow-hidden relative">
        {displayThumbnail ? (
          <img src={displayThumbnail} alt={displayTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {project.video_type === "short" ? (
              <Film className="w-8 h-8 text-muted-foreground/30" />
            ) : (
              <Tv className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
        )}
        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white capitalize">
            {project.video_type}
          </span>
        </div>
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {displayTitle || "Untitled Project"}
        </h3>

        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${statusColor} bg-opacity-20`}
          >
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            {statusName}
          </span>

          {project.due_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(project.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Project List Item Component
function ProjectListItem({ project, studioSlug, boardStatuses }: { project: Project; studioSlug: string; boardStatuses: BoardStatus[] }) {
  // Find the actual board status for this project
  const boardStatus = boardStatuses.find(s => s.id === project.board_status_id);
  const statusName = boardStatus?.name || "Unknown";
  const statusColor = boardStatus?.color || "bg-gray-500";
  
  // Use active set data if available, otherwise fall back to project data
  const displayTitle = project.active_set_title || project.title;
  const displayThumbnail = project.active_set_thumbnail || project.thumbnail_url;

  return (
    <Link
      href={`/studio/${studioSlug}/project/${project.id}`}
      className="glass-card p-4 hover:bg-white/5 transition-colors flex items-center gap-4 group"
    >
      {/* Thumbnail */}
      <div className="w-32 aspect-video rounded-lg bg-gradient-to-br from-white/5 to-white/10 overflow-hidden shrink-0 relative">
        {displayThumbnail ? (
          <img src={displayThumbnail} alt={displayTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {project.video_type === "short" ? (
              <Film className="w-6 h-6 text-muted-foreground/30" />
            ) : (
              <Tv className="w-6 h-6 text-muted-foreground/30" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
          {displayTitle || "Untitled Project"}
        </h3>
        {project.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{project.description}</p>
        )}
      </div>

      {/* Type */}
      <span className="text-xs px-2 py-1 rounded-full bg-white/5 capitalize shrink-0">
        {project.video_type}
      </span>

      {/* Status */}
      <span
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${statusColor} bg-opacity-20 shrink-0`}
      >
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        {statusName}
      </span>

      {/* Date */}
      <span className="text-xs text-muted-foreground shrink-0 w-24 text-right">
        {new Date(project.updated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
    </Link>
  );
}