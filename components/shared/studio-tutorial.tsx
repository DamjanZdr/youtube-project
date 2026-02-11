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
  Sparkles,
  Plus,
  Users,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  expectedPath?: string | RegExp; // Path pattern user should be on
  highlightSelector?: string; // CSS selector for element to highlight
  actionHint?: string; // What the user should do
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // HOME
  {
    id: 0,
    title: "Welcome to Your Studio",
    description: "This is your Home dashboard. Here you see project stats, content pipeline progress, and recent projects. It's your quick overview of everything happening.",
    icon: <Home className="w-6 h-6" />,
    expectedPath: /\/studio\/[^/]+$/,
  },
  // PROJECTS LIST
  {
    id: 1,
    title: "Your Projects Library",
    description: "Click 'Projects' in the sidebar to see all your video projects. This is where you manage your entire content library.",
    icon: <FolderOpen className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-projects']",
    actionHint: "Click 'Projects' in the sidebar",
  },
  {
    id: 2,
    title: "Projects Overview",
    description: "Here's your project library. Browse through your content, filter by status, and manage all your videos in one place.",
    icon: <FolderOpen className="w-6 h-6" />,
    expectedPath: /\/studio\/[^/]+\/projects$/,
  },
  // CREATE PROJECT
  {
    id: 3,
    title: "Create a New Project",
    description: "Let's create a project! Click 'New Project' to start. Every video begins here — just give it a title and you're ready to plan.",
    icon: <Plus className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='new-project']",
    actionHint: "Click 'New Project' to create one",
    expectedPath: /\/studio\/[^/]+\/projects$/,
  },
  // PROJECT PAGES
  {
    id: 4,
    title: "The Idea Page",
    description: "This is your brain dump zone. Use voice-to-text or type freely to capture raw thoughts. No judgment, no editing — just get your ideas out.",
    icon: <Lightbulb className="w-6 h-6" />,
    expectedPath: /\/project\/[^/]+\/idea$/,
  },
  {
    id: 5,
    title: "Package Before You Script",
    description: "Here's the key insight: title, thumbnail, and description determine 90% of clicks. Design packaging FIRST before writing your script.",
    icon: <Package className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-packaging']",
    actionHint: "Click 'Packaging' in the project tabs",
  },
  {
    id: 6,
    title: "Packaging Workshop",
    description: "Create title variations, write descriptions, and design thumbnails. Test different angles before committing. Iterate until it's irresistible.",
    icon: <Package className="w-6 h-6" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
  },
  {
    id: 7,
    title: "Preview Your Video",
    description: "See how your video appears in YouTube's feed and search. Does your thumbnail pop? Is your title compelling?",
    icon: <Eye className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-preview']",
    actionHint: "Click 'Preview' to see how it looks",
  },
  {
    id: 8,
    title: "Feed Preview",
    description: "This preview shows your video alongside others. Check if your thumbnail stands out. Make adjustments in Packaging until satisfied.",
    icon: <Eye className="w-6 h-6" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
  },
  {
    id: 9,
    title: "Visual Storyboarding",
    description: "Plan your story scene by scene. Focus on WHAT viewers see, not HOW you'll edit. Think engagement, retention, emotional beats.",
    icon: <Layout className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-storyboard']",
    actionHint: "Click 'Storyboard' to plan scenes",
  },
  {
    id: 10,
    title: "Scene Planning",
    description: "Add scenes to build structure. Each should have purpose — hook, build tension, deliver value, call to action. Drag to reorder.",
    icon: <Layout className="w-6 h-6" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 11,
    title: "Project Tasks",
    description: "Break down your project into tasks. Research, filming, editing — track everything in one place.",
    icon: <CheckSquare className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-tasks']",
    actionHint: "Click 'Tasks' to see your to-dos",
  },
  {
    id: 12,
    title: "Task Management",
    description: "Create tasks, set due dates, check them off. Default tasks are auto-created based on your workflow. Customize to match how you work.",
    icon: <CheckSquare className="w-6 h-6" />,
    expectedPath: /\/project\/[^/]+\/tasks$/,
  },
  // BOARD
  {
    id: 13,
    title: "The Kanban Board",
    description: "Now let's see all projects at once. Click 'Board' in the sidebar for your content pipeline view.",
    icon: <Columns3 className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-board']",
    actionHint: "Click 'Board' in the sidebar",
  },
  {
    id: 14,
    title: "Your Content Pipeline",
    description: "Drag projects between columns to update status. See what's in progress, needs attention, or is ready to publish. Click any card to open that project.",
    icon: <Columns3 className="w-6 h-6" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
  },
  // WIKI
  {
    id: 15,
    title: "Channel Knowledge Base",
    description: "Click 'Wiki' to access your knowledge base. Store brand guidelines, sponsor info, recurring segments — everything you reference.",
    icon: <BookOpen className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-wiki']",
    actionHint: "Click 'Wiki' in the sidebar",
  },
  {
    id: 16,
    title: "Your Wiki",
    description: "Create folders to organize topics, add documents inside. This is your channel's institutional memory — maintain consistency across videos.",
    icon: <BookOpen className="w-6 h-6" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
  },
  // SETTINGS
  {
    id: 17,
    title: "Studio Settings",
    description: "Finally, let's check settings. Click 'Settings' in the sidebar to customize your studio.",
    icon: <Settings className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='nav-settings']",
    actionHint: "Click 'Settings' in the sidebar",
  },
  {
    id: 18,
    title: "Studio Profile",
    description: "Update your studio name, upload a logo, and find 'Tutorial & Help' to restart this walkthrough anytime.",
    icon: <Settings className="w-6 h-6" />,
    expectedPath: /\/studio\/[^/]+\/settings/,
  },
  {
    id: 19,
    title: "Team Members",
    description: "The 'Members' tab lets you invite collaborators, assign roles, and control access to your studio.",
    icon: <Users className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='settings-members']",
    actionHint: "Click the 'Members' tab",
  },
  {
    id: 20,
    title: "Billing & Subscription",
    description: "The 'Billing' tab shows your plan, usage, and payments. Upgrade to unlock more projects and features.",
    icon: <CreditCard className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='settings-billing']",
    actionHint: "Click the 'Billing' tab",
  },
  // DONE
  {
    id: 21,
    title: "You're All Set!",
    description: "You know the Blueprint workflow: Idea → Packaging → Preview → Storyboard → Tasks. Great videos start with great planning. Go create something amazing!",
    icon: <Sparkles className="w-6 h-6" />,
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

  // Update highlight position when step changes or page changes
  useEffect(() => {
    const step = TUTORIAL_STEPS[currentStep ?? 0];
    if (!step?.highlightSelector || !isVisible) {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(step.highlightSelector!);
      if (element) {
        setHighlightRect(element.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlight();
    const interval = setInterval(updateHighlight, 500);
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
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

  // Show welcome prompt for new users
  if (showWelcome && !isVisible) {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-black/40" />
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-card border border-white/10 rounded-2xl shadow-2xl p-8 max-w-lg w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-3">Welcome to Blueprint!</h2>
          <p className="text-muted-foreground text-center leading-relaxed mb-6">
            Would you like a quick walkthrough of the studio? We&apos;ll guide you through 
            each feature so you can start creating effectively.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkipWelcome} className="flex-1">
              Skip for now
            </Button>
            <Button onClick={handleStart} className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Tutorial
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
  const progress = ((currentStep ?? 0) / (TUTORIAL_STEPS.length - 1)) * 100;

  return (
    <>
      {/* Highlight ring for interactive elements */}
      {highlightRect && (
        <div
          className="fixed ring-4 ring-primary rounded-lg pointer-events-none z-[99] animate-pulse"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Tutorial Card - fixed bottom right */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 glass-card border border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-[calc(100vw-2rem)] md:w-96 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100]">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-t-2xl overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold leading-tight">{step.title}</h2>
            <span className="text-xs text-muted-foreground">
              Step {(currentStep ?? 0) + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Action hint */}
        {step.actionHint && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-4">
            <p className="text-sm text-primary font-medium">
              👉 {step.actionHint}
            </p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-1 mb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i === currentStep ? "bg-primary" : i < (currentStep ?? 0) ? "bg-primary/50" : "bg-white/20"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={handleNext} className="flex-1">
            {isLastStep ? (
              "Finish"
            ) : step.actionHint ? (
              "I did it"
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
      <Sparkles className="w-4 h-4 mr-2" />
      Start Tutorial
    </Button>
  );
}
