"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  Home,
  FolderOpen,
  Lightbulb,
  Package,
  Eye,
  Layout,
  CheckSquare,
  Columns3,
  BookOpen,
  Settings,
  Plus,
  Users,
  CreditCard,
  Mic,
  Type,
  Image,
  FileText,
  GripVertical,
  Play
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  content: string; // Direct, practical explanation
  icon: React.ReactNode;
  expectedPath?: string | RegExp;
  highlightSelector?: string; // For info highlights (blue)
  clickSelector?: string; // For action highlights (green) - user needs to click this
  infoSelectors?: string[]; // Multiple elements to highlight as info
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // === HOME PAGE ===
  {
    id: 0,
    title: "Home Dashboard",
    content: "The top row shows your project counts: Total projects, In Progress, and Completed. Use these to quickly see your workload at a glance.",
    icon: <Home className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+$/,
    highlightSelector: ".grid.grid-cols-3",
  },
  {
    id: 1,
    title: "Content Pipeline",
    content: "The colored bars show how many projects are in each stage of your workflow. Each color represents a status column from your Board. This helps you identify bottlenecks — if too many projects pile up in one stage, you know where to focus.",
    icon: <Home className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+$/,
    highlightSelector: "[class*='Content Pipeline']",
  },
  {
    id: 2,
    title: "Recent Projects",
    content: "Your 5 most recently updated projects appear here for quick access. Click any project to jump directly into it. Use 'View all' to see your complete project library.",
    icon: <Home className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+$/,
  },
  {
    id: 3,
    title: "Go to Projects",
    content: "Open the Projects page to see your full library and create new videos.",
    icon: <FolderOpen className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-projects']",
  },

  // === PROJECTS PAGE ===
  {
    id: 4,
    title: "Projects Library",
    content: "This page lists all your video projects. Each card shows the project title, current status, and thumbnail. Projects are grouped by type: Long-form videos and Shorts.",
    icon: <FolderOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/projects$/,
  },
  {
    id: 5,
    title: "Create a Project",
    content: "Click 'New Project' to start a new video. You'll enter a title and choose between Long-form or Short. The project will be created and you'll land on the Idea page to start planning.",
    icon: <Plus className="w-5 h-5" />,
    clickSelector: "[data-tutorial='new-project']",
    expectedPath: /\/studio\/[^/]+\/projects$/,
  },

  // === IDEA PAGE ===
  {
    id: 6,
    title: "Idea Page - Brain Dump",
    content: "This is where you capture raw ideas before organizing them. Type anything — concepts, hooks, points to cover, research notes. The goal is to get everything out of your head without worrying about structure.",
    icon: <Lightbulb className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/idea$/,
  },
  {
    id: 7,
    title: "Voice-to-Text",
    content: "Click the microphone button to dictate your ideas instead of typing. This is faster for brainstorming — just talk through your video concept and it transcribes automatically. Use this every time you have a new video idea to capture it quickly.",
    icon: <Mic className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/idea$/,
    highlightSelector: "[data-tutorial='voice-button']",
  },
  {
    id: 8,
    title: "Why Use the Idea Page",
    content: "Writing ideas down before packaging forces you to clarify your thinking. Many creators skip this and end up with unfocused videos. Spend 5-10 minutes here for every project — it saves hours of confusion later.",
    icon: <Lightbulb className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/idea$/,
  },
  {
    id: 9,
    title: "Go to Packaging",
    content: "Move to Packaging to design your title, thumbnail, and description.",
    icon: <Package className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-packaging']",
  },

  // === PACKAGING PAGE ===
  {
    id: 10,
    title: "Packaging - The Click Decision",
    content: "Your title, thumbnail, and description determine whether someone clicks your video. Design these BEFORE writing your script. This ensures your video delivers on its promise instead of forcing a title onto finished content.",
    icon: <Package className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
  },
  {
    id: 11,
    title: "Title Variations",
    content: "Write 3-5 different titles for your video. Each should approach the topic from a different angle. Test which creates the most curiosity. Bad title = no clicks, regardless of how good your video is.",
    icon: <Type className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
    highlightSelector: "[data-tutorial='title-input']",
  },
  {
    id: 12,
    title: "Thumbnail Upload",
    content: "Upload or design your thumbnail here. Your thumbnail is 90% of the click decision on mobile. It should be readable at small sizes, create curiosity, and clearly communicate the video's value.",
    icon: <Image className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
    highlightSelector: "[data-tutorial='thumbnail-upload']",
  },
  {
    id: 13,
    title: "Description",
    content: "Write your video description. Include keywords for search, timestamps for longer videos, and links to related content. The first 2 lines show in search results — make them count.",
    icon: <FileText className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
    highlightSelector: "[data-tutorial='description-input']",
  },
  {
    id: 14,
    title: "Packaging Sets",
    content: "Create multiple packaging variations to A/B test different approaches. Click 'Add Set' to create alternatives. Mark one as 'Selected' to use it as your primary. You can switch later if performance data suggests a different approach would work better.",
    icon: <Package className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
  },
  {
    id: 15,
    title: "Go to Preview",
    content: "See how your packaging looks in YouTube's actual interface.",
    icon: <Eye className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-preview']",
  },

  // === PREVIEW PAGE ===
  {
    id: 16,
    title: "Preview - See Before Publishing",
    content: "This page shows exactly how your video will appear on YouTube. Check your thumbnail at real sizes, see your title next to competitors, and verify everything looks right before producing the video.",
    icon: <Eye className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
  },
  {
    id: 17,
    title: "Feed View",
    content: "The Home Feed preview shows your video as it appears on YouTube's homepage. Your thumbnail competes against other videos for attention. If it doesn't stand out here, viewers will scroll past it.",
    icon: <Eye className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
  },
  {
    id: 18,
    title: "Search & Sidebar",
    content: "Toggle between Feed, Search, and Sidebar views. Search shows how your video appears in YouTube search results. Sidebar shows how it looks in 'Recommended' next to other videos. Test all three.",
    icon: <Eye className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
  },
  {
    id: 19,
    title: "Why Preview Matters",
    content: "Most creators never see their video the way viewers do until after publishing. By previewing first, you catch problems early — unreadable thumbnails, boring titles, missing descriptions. Fix these before you invest time filming.",
    icon: <Eye className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
  },
  {
    id: 20,
    title: "Go to Storyboard",
    content: "Plan the visual structure of your video.",
    icon: <Layout className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-storyboard']",
  },

  // === STORYBOARD PAGE ===
  {
    id: 21,
    title: "Storyboard - Visual Planning",
    content: "Plan what viewers will see, scene by scene. Focus on the story structure — hook, buildup, payoff. Don't plan editing details like B-roll or transitions yet. Those come during post-production.",
    icon: <Layout className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 22,
    title: "Adding Scenes",
    content: "Click 'Add Scene' to create a new scene card. Give each scene a title and description of what happens. Add reference images if helpful. Each scene should have one clear purpose in your video.",
    icon: <Plus className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 23,
    title: "Scene Order",
    content: "Drag scenes to reorder them. Your first scene is your hook — you have 30 seconds to grab attention. Middle scenes build value. Final scenes deliver the payoff and call to action.",
    icon: <GripVertical className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 24,
    title: "Why Storyboard",
    content: "Storyboarding before filming prevents wasted shoots and meandering videos. You'll know exactly what footage you need, making production faster. Viewers stay engaged because every scene has purpose.",
    icon: <Layout className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 25,
    title: "Go to Tasks",
    content: "Track the work needed to complete this project.",
    icon: <CheckSquare className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-tasks']",
  },

  // === TASKS PAGE ===
  {
    id: 26,
    title: "Tasks - Project Checklist",
    content: "Every project has tasks: research, scripting, filming, editing, publishing. This page tracks them all. Check off tasks as you complete them to see your progress.",
    icon: <CheckSquare className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/tasks$/,
  },
  {
    id: 27,
    title: "Default Tasks",
    content: "New projects automatically get default tasks based on typical video production workflow. These are starting points — delete tasks you don't need, add custom ones for your specific process.",
    icon: <CheckSquare className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/tasks$/,
  },
  {
    id: 28,
    title: "Adding Tasks",
    content: "Click 'Add Task' to create custom tasks. Be specific: 'Film intro shot at desk' is better than 'Film video'. Specific tasks are easier to complete and track.",
    icon: <Plus className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/tasks$/,
  },
  {
    id: 29,
    title: "Why Track Tasks",
    content: "Without a task list, it's easy to forget steps or feel overwhelmed by a project. Breaking work into checkable tasks makes progress visible and keeps you moving forward.",
    icon: <CheckSquare className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/tasks$/,
  },
  {
    id: 30,
    title: "Go to Board",
    content: "See all your projects on the Kanban board.",
    icon: <Columns3 className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-board']",
  },

  // === BOARD PAGE ===
  {
    id: 31,
    title: "Board - Pipeline View",
    content: "The Board shows all projects organized by status. Each column is a stage in your workflow. Drag project cards between columns as they progress from idea to published.",
    icon: <Columns3 className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
  },
  {
    id: 32,
    title: "Project Cards",
    content: "Each card shows the project thumbnail, title, and type. Click any card to open that project. Cards show which stage each video is in at a glance.",
    icon: <Columns3 className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
  },
  {
    id: 33,
    title: "Moving Projects",
    content: "Drag cards between columns to update their status. When you finish filming, drag from 'Filming' to 'Editing'. The Board updates automatically — no extra clicks needed.",
    icon: <GripVertical className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
  },
  {
    id: 34,
    title: "Why Use the Board",
    content: "The Board prevents projects from getting stuck or forgotten. You can see your entire content pipeline, identify bottlenecks where projects pile up, and ensure nothing falls through the cracks.",
    icon: <Columns3 className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
  },
  {
    id: 35,
    title: "Go to Wiki",
    content: "Store your channel's reference documents.",
    icon: <BookOpen className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-wiki']",
  },

  // === WIKI PAGE ===
  {
    id: 36,
    title: "Wiki - Knowledge Base",
    content: "The Wiki stores information you reference across multiple videos: brand guidelines, sponsor details, recurring segments, equipment settings, anything you need to remember.",
    icon: <BookOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
  },
  {
    id: 37,
    title: "Folders",
    content: "Create folders to organize topics. Examples: 'Brand Guidelines', 'Sponsors', 'Equipment', 'Recurring Segments'. Keep related documents together for easy access.",
    icon: <FolderOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
  },
  {
    id: 38,
    title: "Documents",
    content: "Inside folders, create documents with detailed information. A sponsor document might include contact info, talking points, and link requirements. Update these as things change.",
    icon: <FileText className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
  },
  {
    id: 39,
    title: "Why Maintain a Wiki",
    content: "Without documentation, you'll waste time re-finding information for every video. The Wiki is your channel's memory — it maintains consistency and speeds up production, especially when working with team members.",
    icon: <BookOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
  },
  {
    id: 40,
    title: "Go to Settings",
    content: "Configure your studio preferences.",
    icon: <Settings className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-settings']",
  },

  // === SETTINGS PAGE ===
  {
    id: 41,
    title: "Settings - Studio Tab",
    content: "The Studio tab contains your studio name, logo, and URL. Update these to match your brand. The 'Restart Tutorial' button is here if you ever want to go through this walkthrough again.",
    icon: <Settings className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/settings/,
  },
  {
    id: 42,
    title: "Members Tab",
    content: "Open the Members tab to manage your team.",
    icon: <Users className="w-5 h-5" />,
    clickSelector: "[data-tutorial='settings-members']",
  },
  {
    id: 43,
    title: "Team Management",
    content: "The Members tab shows everyone with access to this studio. Invite collaborators by email, see pending invites, and remove members if needed. Team members can access projects based on their role.",
    icon: <Users className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/settings/,
  },
  {
    id: 44,
    title: "Billing Tab",
    content: "Open the Billing tab to see your subscription.",
    icon: <CreditCard className="w-5 h-5" />,
    clickSelector: "[data-tutorial='settings-billing']",
  },
  {
    id: 45,
    title: "Subscription & Limits",
    content: "The Billing tab shows your current plan, project limits, and team member limits. Upgrade to unlock more projects and invite more team members. Manage your payment method here.",
    icon: <CreditCard className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/settings/,
  },

  // === DONE ===
  {
    id: 46,
    title: "Tutorial Complete",
    content: "You've seen every feature. The workflow is: capture ideas, design packaging, preview it, storyboard the structure, track tasks, manage projects on the board, and store references in the wiki. Start using these tools for your next video.",
    icon: <Play className="w-5 h-5" />,
  },
];

interface StudioTutorialProps {
  studioSlug: string;
  organizationId: string;
  userId: string;
  initialStep: number | null;
}

export function StudioTutorial({ 
  studioSlug, 
  organizationId, 
  userId, 
  initialStep,
}: StudioTutorialProps) {
  const pathname = usePathname();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState<number | null>(initialStep);
  const [showWelcome, setShowWelcome] = useState(initialStep === null);
  const [isVisible, setIsVisible] = useState(
    initialStep !== null && initialStep >= 0 && initialStep < TUTORIAL_STEPS.length
  );
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [clickRect, setClickRect] = useState<DOMRect | null>(null);

  // Update highlight positions when step changes
  useEffect(() => {
    const step = TUTORIAL_STEPS[currentStep ?? 0];
    if (!isVisible) {
      setHighlightRect(null);
      setClickRect(null);
      return;
    }

    const updateHighlights = () => {
      // Info highlight (blue)
      if (step?.highlightSelector) {
        const element = document.querySelector(step.highlightSelector);
        if (element) {
          setHighlightRect(element.getBoundingClientRect());
        } else {
          setHighlightRect(null);
        }
      } else {
        setHighlightRect(null);
      }

      // Click highlight (green)
      if (step?.clickSelector) {
        const element = document.querySelector(step.clickSelector);
        if (element) {
          setClickRect(element.getBoundingClientRect());
        } else {
          setClickRect(null);
        }
      } else {
        setClickRect(null);
      }
    };

    updateHighlights();
    const interval = setInterval(updateHighlights, 500);
    window.addEventListener("resize", updateHighlights);
    window.addEventListener("scroll", updateHighlights);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateHighlights);
      window.removeEventListener("scroll", updateHighlights);
    };
  }, [currentStep, isVisible, pathname]);

  // Auto-advance when user navigates to expected path
  useEffect(() => {
    if (!isVisible || currentStep === null) return;
    
    const nextStep = TUTORIAL_STEPS[currentStep + 1];
    
    if (nextStep?.expectedPath) {
      const matches = typeof nextStep.expectedPath === 'string' 
        ? pathname === nextStep.expectedPath || pathname.endsWith(nextStep.expectedPath)
        : nextStep.expectedPath.test(pathname);
      
      if (matches) {
        setCurrentStep(currentStep + 1);
        saveProgress(currentStep + 1);
      }
    }
  }, [pathname, currentStep, isVisible]);

  const saveProgress = useCallback(async (step: number | null) => {
    const isCompleted = step === null || step >= TUTORIAL_STEPS.length;
    
    await supabase
      .from("organization_members")
      .update({ 
        tutorial_step: isCompleted ? TUTORIAL_STEPS.length : step,
        tutorial_completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
  }, [supabase, organizationId, userId]);

  const handleNext = async () => {
    const nextStep = (currentStep ?? 0) + 1;
    
    if (nextStep >= TUTORIAL_STEPS.length) {
      setIsVisible(false);
      await saveProgress(TUTORIAL_STEPS.length);
    } else {
      setCurrentStep(nextStep);
      await saveProgress(nextStep);
    }
  };

  const handlePrev = async () => {
    const prevStep = Math.max(0, (currentStep ?? 0) - 1);
    setCurrentStep(prevStep);
    await saveProgress(prevStep);
  };

  const handleSkip = async () => {
    setIsVisible(false);
    setShowWelcome(false);
    await saveProgress(TUTORIAL_STEPS.length);
  };

  const handleStart = async () => {
    setShowWelcome(false);
    setCurrentStep(0);
    setIsVisible(true);
    await saveProgress(0);
  };

  const handleSkipWelcome = async () => {
    setShowWelcome(false);
    await saveProgress(TUTORIAL_STEPS.length);
  };

  // Welcome prompt
  if (showWelcome && !isVisible) {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 max-w-lg w-[90vw]">
          <h2 className="text-2xl font-bold text-center mb-3">Learn the Studio</h2>
          <p className="text-zinc-400 text-center leading-relaxed mb-6">
            Quick walkthrough of every feature. Takes about 5 minutes. 
            You can restart this anytime from Settings.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkipWelcome} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleStart} className="flex-1">
              Start
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep ?? 0];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <>
      {/* Info highlight - blue border, subtle */}
      {highlightRect && (
        <div
          className="fixed border-2 border-blue-400/70 rounded-lg pointer-events-none z-[99]"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Click highlight - green pulsing ring */}
      {clickRect && (
        <div
          className="fixed ring-4 ring-emerald-400 rounded-lg pointer-events-none z-[99] animate-pulse"
          style={{
            left: clickRect.left - 6,
            top: clickRect.top - 6,
            width: clickRect.width + 12,
            height: clickRect.height + 12,
          }}
        />
      )}

      {/* Tutorial Card - solid background for readability */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-[calc(100vw-2rem)] md:w-96 z-[100]">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3 pr-6">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white flex-shrink-0">
            {step.icon}
          </div>
          <h2 className="text-base font-semibold leading-tight pt-1.5">{step.title}</h2>
        </div>

        {/* Content */}
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Click instruction */}
        {step.clickSelector && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 mb-4">
            <p className="text-sm text-emerald-400 font-medium">
              Click the highlighted element to continue
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1 bg-transparent border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={handleNext} className="flex-1">
            {isLastStep ? (
              "Done"
            ) : step.clickSelector ? (
              "I clicked it"
            ) : (
              <>
                Next
                <ArrowRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// Button to restart the tutorial
export function StartTutorialButton({ 
  studioSlug, 
  organizationId, 
  userId,
  className 
}: { 
  studioSlug: string;
  organizationId: string;
  userId: string;
  className?: string;
}) {
  const supabase = createClient();

  const handleStartTutorial = async () => {
    await supabase
      .from("organization_members")
      .update({ tutorial_step: 0, tutorial_completed_at: null })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    
    window.location.href = `/studio/${studioSlug}`;
  };

  return (
    <Button variant="outline" onClick={handleStartTutorial} className={className}>
      Restart Tutorial
    </Button>
  );
}
