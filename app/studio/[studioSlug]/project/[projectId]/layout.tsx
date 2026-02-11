"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Trash2,
  Copy,
  ExternalLink,
  ListTodo,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
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

interface Project {
  id: string;
  description: string | null;
  video_type: "long" | "short";
  due_date: string | null;
  scheduled_for: string | null;
  youtube_video_id: string | null;
}

interface PackagingSet {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_selected: boolean;
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const studioSlug = params.studioSlug as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeSet, setActiveSet] = useState<PackagingSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Scroll indicators state
  const tabsNavRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      setCanScrollLeft(nav.scrollLeft > 0);
      setCanScrollRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      updateScrollIndicators();
      nav.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
      return () => {
        nav.removeEventListener('scroll', updateScrollIndicators);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, [updateScrollIndicators, loading]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const supabase = createClient();
    
    // Fetch project details
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    // Fetch active packaging set
    const { data: setData } = await supabase
      .from("packaging_sets")
      .select("id, title, thumbnail_url, is_selected")
      .eq("project_id", projectId)
      .eq("is_selected", true)
      .single();

    if (projectData) {
      setProject(projectData);
    }
    
    if (setData) {
      setActiveSet(setData);
    }
    
    setLoading(false);
  };

  const tabs = [
    { href: `/studio/${studioSlug}/project/${projectId}/idea`, icon: Lightbulb, label: "Idea" },
    { href: `/studio/${studioSlug}/project/${projectId}`, icon: Package, label: "Packaging", exact: true, tutorialId: "nav-packaging" },
    { href: `/studio/${studioSlug}/project/${projectId}/preview`, icon: Eye, label: "Preview", tutorialId: "nav-preview" },
    { href: `/studio/${studioSlug}/project/${projectId}/storyboard`, icon: Film, label: "Storyboard", tutorialId: "nav-storyboard" },
    { href: `/studio/${studioSlug}/project/${projectId}/tasks`, icon: ListTodo, label: "Tasks", tutorialId: "nav-tasks" },
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

  const projectTitle = activeSet?.title || "Untitled Project";
  const projectThumbnail = activeSet?.thumbnail_url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Project Header */}
      <header className="glass-strong border-b border-white/5 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link
              href={`/studio/${studioSlug}/projects`}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Link>

            {/* Thumbnail Preview - hidden on mobile */}
            <div className="hidden sm:block w-16 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden shrink-0">
              {projectThumbnail ? (
                <img src={projectThumbnail} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-semibold truncate">{projectTitle}</h1>
              <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                {/* Type Badge */}
                <span className="text-[10px] md:text-xs text-muted-foreground px-1.5 md:px-2 py-0.5 rounded-full bg-white/5 capitalize">
                  {project.video_type} form
                </span>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {project.due_date && (
              <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(project.due_date).toLocaleDateString()}
              </span>
            )}

            {/* More Menu */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
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

        {/* Tab Navigation with Scroll Indicators */}
        <div className="relative mt-3 md:mt-4 -mb-3 md:-mb-4">
          {/* Left scroll indicator */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: -150, behavior: 'smooth' });
              }}
              className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start md:hidden"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          
          <nav 
            ref={tabsNavRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-6 md:px-0"
          >
            {tabs.map((tab) => {
              const active = isTabActive(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  data-tutorial={tab.tutorialId}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${
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
          
          {/* Right scroll indicator */}
          {canScrollRight && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: 150, behavior: 'smooth' });
              }}
              className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end md:hidden"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 min-h-0 relative flex flex-col">{children}</main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{projectTitle}"? This action cannot be undone.
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
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowMoreMenu(false);
          }}
        />
      )}
    </div>
  );
}