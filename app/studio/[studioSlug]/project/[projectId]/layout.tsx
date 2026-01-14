"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Eye,
  Film,
  Settings,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  Lightbulb,
  FileText,
  Video,
  Scissors,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STATUS_CONFIG = {
  idea: { label: "Idea", color: "bg-purple-500", icon: Lightbulb },
  script: { label: "Script", color: "bg-blue-500", icon: FileText },
  recording: { label: "Recording", color: "bg-yellow-500", icon: Video },
  editing: { label: "Editing", color: "bg-orange-500", icon: Scissors },
  scheduled: { label: "Scheduled", color: "bg-cyan-500", icon: Clock },
  published: { label: "Published", color: "bg-green-500", icon: CheckCircle2 },
};

type ProjectStatus = keyof typeof STATUS_CONFIG;

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  video_type: "long" | "short";
  thumbnail_url: string | null;
  due_date: string | null;
  scheduled_for: string | null;
  youtube_video_id: string | null;
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const studioSlug = params.studioSlug as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (data) {
      setProject(data);
    }
    setLoading(false);
  };

  const updateStatus = async (newStatus: ProjectStatus) => {
    if (!project) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId);

    if (!error) {
      setProject({ ...project, status: newStatus });
    }
    setShowStatusMenu(false);
  };

  const tabs = [
    { href: `/studio/${studioSlug}/project/${projectId}`, icon: Package, label: "Packaging", exact: true },
    { href: `/studio/${studioSlug}/project/${projectId}/storyboard`, icon: Film, label: "Storyboard" },
    { href: `/studio/${studioSlug}/project/${projectId}/preview`, icon: Eye, label: "Preview" },
    { href: `/studio/${studioSlug}/project/${projectId}/tasks`, icon: ListTodo, label: "Tasks" },
    { href: `/studio/${studioSlug}/project/${projectId}/settings`, icon: Settings, label: "" },
  ];

  const isTabActive = (tab: typeof tabs[0]) => {
    if (tab.exact) {
      return pathname === tab.href || pathname === `${tab.href}/packaging`;
    }
    return pathname.startsWith(tab.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
        <p className="text-muted-foreground mb-4">This project doesn't exist or you don't have access.</p>
        <Link href={`/studio/${studioSlug}/projects`}>
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.idea;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Project Header */}
      <header className="glass-strong border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <Link
              href={`/studio/${studioSlug}/projects`}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Thumbnail Preview */}
            <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden">
              {project.thumbnail_url ? (
                <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div>
              <h1 className="text-xl font-semibold">{project.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                {/* Status Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${statusConfig.color} bg-opacity-20 hover:bg-opacity-30 transition-all`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 glass-card p-2 z-50">
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => updateStatus(key as ProjectStatus)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                              project.status === key ? "bg-white/10" : "hover:bg-white/5"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${config.color}`} />
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-white/5 capitalize">
                  {project.video_type} form
                </span>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {project.due_date && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(project.due_date).toLocaleDateString()}
              </span>
            )}

            {/* YouTube Link (if published) */}
            {project.youtube_video_id && (
              <a
                href={`https://youtube.com/watch?v=${project.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
              >
                <ExternalLink className="w-4 h-4" />
                View on YouTube
              </a>
            )}

            {/* More Menu */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 glass-card p-2 z-50">
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-white/5">
                    <Copy className="w-4 h-4" />
                    Duplicate Project
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-white/5 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 mt-4 -mb-4">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  active
                    ? "text-white border-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent hover:border-white/20"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Tab Content */}
      <main className="flex-1 min-h-0 relative">{children}</main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Delete Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click outside to close menus */}
      {(showStatusMenu || showMoreMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowStatusMenu(false);
            setShowMoreMenu(false);
          }}
        />
      )}
    </div>
  );
}