"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  Lightbulb,
  Package,
  Eye,
  Layout,
  CheckSquare,
  Columns3,
  BookOpen,
  Settings,
  Sparkles,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetPath?: string; // Path user should be on for this step
  highlightSelector?: string; // CSS selector for element to highlight
  position?: "center" | "top" | "bottom" | "left" | "right";
  requiresProject?: boolean; // Step requires a project to exist
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Welcome to Blueprint Studio",
    description: "This is your creative command center. We'll walk you through how to plan, package, and produce your content more effectively. Let's start by understanding the core philosophy: plan the vision before you write the script.",
    icon: <Sparkles className="w-6 h-6" />,
    position: "center",
  },
  {
    id: 1,
    title: "Create Your First Project",
    description: "Every video starts as a project. Click 'New Project' to create one. Don't worry about having everything figured out — start with just a rough idea and we'll help you develop it.",
    icon: <Plus className="w-6 h-6" />,
    highlightSelector: "[data-tutorial='new-project']",
    position: "right",
  },
  {
    id: 2,
    title: "Start with the Idea",
    description: "The Idea page is your brain dump zone. Use voice-to-text to capture your raw thoughts without worrying about structure. This is where creativity flows freely — no judgment, no editing, just capture everything.",
    icon: <Lightbulb className="w-6 h-6" />,
    targetPath: "/idea",
    requiresProject: true,
    position: "center",
  },
  {
    id: 3,
    title: "Package Before You Script",
    description: "Here's the key insight: your title, description, and thumbnail determine 90% of whether someone clicks. By designing your packaging FIRST, you ensure your video delivers on its promise. Don't write a script then try to fit a title to it — start with what will get clicks.",
    icon: <Package className="w-6 h-6" />,
    targetPath: "/packaging",
    requiresProject: true,
    position: "center",
  },
  {
    id: 4,
    title: "Preview Your Packaging",
    description: "See how your video will look in the YouTube feed, search results, and recommended sidebar. This helps you optimize for click-through before you invest time in production. Does your thumbnail stand out? Is your title compelling?",
    icon: <Eye className="w-6 h-6" />,
    targetPath: "/preview",
    requiresProject: true,
    position: "center",
  },
  {
    id: 5,
    title: "Visual Storyboarding",
    description: "Plan your visual story scene by scene. Focus on WHAT the viewer sees, not HOW you'll edit it. Think about engagement, retention, and emotional beats. Leave the B-roll and transitions for the edit — this is about the story structure.",
    icon: <Layout className="w-6 h-6" />,
    targetPath: "/storyboard",
    requiresProject: true,
    position: "center",
  },
  {
    id: 6,
    title: "Track Your Tasks",
    description: "Break down your project into actionable tasks. From research to filming to post-production, keep everything organized in one place. Check off items as you complete them to track progress.",
    icon: <CheckSquare className="w-6 h-6" />,
    targetPath: "/tasks",
    requiresProject: true,
    position: "center",
  },
  {
    id: 7,
    title: "The Board Overview",
    description: "See all your projects at a glance with the Kanban board. Drag projects between columns to track their status from idea to published. This is your bird's-eye view of your content pipeline.",
    icon: <Columns3 className="w-6 h-6" />,
    targetPath: "/board",
    position: "center",
  },
  {
    id: 8,
    title: "Your Channel Wiki",
    description: "Build a knowledge base for your channel. Store recurring elements, brand guidelines, sponsor information, and anything you reference frequently. It's your channel's institutional memory.",
    icon: <BookOpen className="w-6 h-6" />,
    targetPath: "/wiki",
    position: "center",
  },
  {
    id: 9,
    title: "Studio Settings",
    description: "Customize your studio's name, manage team members, configure your workflow statuses, and control your subscription. Everything about your studio lives here.",
    icon: <Settings className="w-6 h-6" />,
    targetPath: "/settings",
    position: "center",
  },
  {
    id: 10,
    title: "You're All Set!",
    description: "You now know the Blueprint workflow: Idea → Packaging → Preview → Storyboard → Tasks → Produce. Remember: great videos start with great planning. Now go create something amazing!",
    icon: <Sparkles className="w-6 h-6" />,
    position: "center",
  },
];

interface StudioTutorialProps {
  studioSlug: string;
  organizationId: string;
  userId: string;
  initialStep: number | null;
  hasProjects: boolean;
  firstProjectId?: string;
}

export function StudioTutorial({ 
  studioSlug, 
  organizationId, 
  userId, 
  initialStep,
  hasProjects,
  firstProjectId
}: StudioTutorialProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  // null = never started (show welcome prompt), number = current step
  const [currentStep, setCurrentStep] = useState<number | null>(initialStep);
  // Show welcome prompt for new users, or continue for in-progress users
  const [showWelcome, setShowWelcome] = useState(initialStep === null);
  const [isVisible, setIsVisible] = useState(
    initialStep !== null && initialStep >= 0 && initialStep < TUTORIAL_STEPS.length
  );
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Update highlight position when step changes
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
      }
    };

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);
    
    // Re-check after a short delay for dynamic elements
    const timeout = setTimeout(updateHighlight, 100);
    
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
      clearTimeout(timeout);
    };
  }, [currentStep, isVisible]);

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
    
    // Check if we need to navigate for the next step
    const step = TUTORIAL_STEPS[nextStep];
    if (step) {
      if (step.requiresProject && !hasProjects) {
        // Skip project-specific steps if no project exists
        setCurrentStep(7); // Jump to Board
        await saveProgress(7);
        router.push(`/studio/${studioSlug}/board`);
        return;
      }
      
      if (step.targetPath) {
        if (step.requiresProject && firstProjectId) {
          router.push(`/studio/${studioSlug}/project/${firstProjectId}${step.targetPath}`);
        } else if (!step.requiresProject) {
          router.push(`/studio/${studioSlug}${step.targetPath}`);
        }
      }
    }
    
    if (nextStep >= TUTORIAL_STEPS.length) {
      // Tutorial complete
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
    
    const step = TUTORIAL_STEPS[prevStep];
    if (step?.targetPath) {
      if (step.requiresProject && firstProjectId) {
        router.push(`/studio/${studioSlug}/project/${firstProjectId}${step.targetPath}`);
      } else if (!step.requiresProject) {
        router.push(`/studio/${studioSlug}${step.targetPath}`);
      }
    } else if (prevStep <= 1) {
      router.push(`/studio/${studioSlug}`);
    }
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
    await saveProgress(TUTORIAL_STEPS.length); // Mark as completed/skipped
  };

  // Show welcome prompt for new users
  if (showWelcome && !isVisible) {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-black/40" />
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-card border border-white/10 rounded-2xl shadow-2xl p-8 max-w-lg w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-center mb-3">Welcome to Blueprint!</h2>
          <p className="text-muted-foreground text-center leading-relaxed mb-6">
            Would you like a quick walkthrough of the studio? We&apos;ll show you how to plan, 
            package, and produce your content more effectively.
          </p>

          {/* Buttons */}
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
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop - allow clicks through */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Clickable highlight area for interactive elements */}
      {highlightRect && (
        <div
          className="pointer-events-auto absolute ring-4 ring-primary ring-offset-2 ring-offset-transparent rounded-lg cursor-pointer"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            zIndex: 101,
          }}
          onClick={(e) => {
            // Allow clicks to pass through to the underlying element
            e.stopPropagation();
            const element = document.elementFromPoint(
              highlightRect.left + highlightRect.width / 2,
              highlightRect.top + highlightRect.height / 2
            ) as HTMLElement;
            element?.click();
          }}
        />
      )}

      {/* Tutorial Card */}
      <div 
        className={cn(
          "pointer-events-auto absolute glass-card border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300",
          step.position === "center" && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          step.position === "right" && highlightRect && "top-1/2 -translate-y-1/2",
          step.position === "bottom" && "left-1/2 -translate-x-1/2",
        )}
        style={
          step.position === "right" && highlightRect
            ? { left: highlightRect.right + 24 }
            : step.position === "bottom" && highlightRect
            ? { top: highlightRect.bottom + 24 }
            : undefined
        }
      >
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
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
          {step.icon}
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          {step.description}
        </p>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            Step {(currentStep ?? 0) + 1} of {TUTORIAL_STEPS.length}
          </span>
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === currentStep ? "bg-primary" : i < (currentStep ?? 0) ? "bg-primary/50" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {!isFirstStep && (
            <Button variant="outline" onClick={handlePrev} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? (
              "Finish"
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Button to restart the tutorial from settings or help
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
  const router = useRouter();
  const supabase = createClient();

  const handleStartTutorial = async () => {
    await supabase
      .from("organization_members")
      .update({ tutorial_step: 0, tutorial_completed_at: null })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    
    router.push(`/studio/${studioSlug}`);
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleStartTutorial} className={className}>
      <Sparkles className="w-4 h-4 mr-2" />
      Start Tutorial
    </Button>
  );
}
