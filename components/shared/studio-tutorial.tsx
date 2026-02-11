"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  User,
  Play
} from "lucide-react";

interface HighlightItem {
  selector: string;
  label?: string; // Optional numbered label like "1", "2", etc.
}

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  expectedPath?: string | RegExp;
  highlights?: HighlightItem[]; // Multiple elements to highlight with labels
  clickSelector?: string; // Element user needs to click (green pulsing)
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // === 1. HOME PAGE ===
  {
    id: 0,
    title: "Welcome to Your Studio",
    content: "This is the home page where you can see a summary of all your projects.",
    icon: <Home className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+$/,
  },
  {
    id: 1,
    title: "Project Overview",
    content: "Here you can see: (1) the total amount of projects your studio has, (2) how many are in progress, (3) how many are completed, (4) projects in each stage, and (5) your most recent projects.",
    icon: <Home className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+$/,
    highlights: [
      { selector: "[data-tutorial='stat-total']", label: "1" },
      { selector: "[data-tutorial='stat-progress']", label: "2" },
      { selector: "[data-tutorial='stat-completed']", label: "3" },
      { selector: "[data-tutorial='pipeline']", label: "4" },
      { selector: "[data-tutorial='recent-projects']", label: "5" },
    ],
  },
  {
    id: 2,
    title: "Go to Projects",
    content: "Up next is the Projects tab. Click on it to proceed.",
    icon: <FolderOpen className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-projects']",
  },

  // === 2. PROJECTS PAGE ===
  {
    id: 3,
    title: "Projects Library",
    content: "This is where all of your projects are created and stored. Go ahead, try creating a new project.",
    icon: <FolderOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/projects$/,
    clickSelector: "[data-tutorial='new-project']",
  },
  {
    id: 4,
    title: "Create Project Dialog",
    content: "The project creation dialogue isn't mandatory to fill out. If you don't have a name for the project yet, and just want to brainstorm, you can leave the title empty. Just select whether you are thinking of a long form video or a short video and create the project.",
    icon: <Plus className="w-5 h-5" />,
  },

  // === 3. IDEA PAGE ===
  {
    id: 5,
    title: "Idea Tab",
    content: "As you can see when creating a project, we land on the Idea tab. It's always useful to have some place to note down your brainstorming. Write down your ideas, plan your hook, what will keep the users watching after the hook, what do you want your call to action of this video to be.",
    icon: <Lightbulb className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/idea$/,
    highlights: [
      { selector: "[data-tutorial='idea-editor']" },
    ],
  },
  {
    id: 6,
    title: "Voice to Text",
    content: "You can also use \"Voice\" if you are not a fan of writing manually. This is a simple voice to text feature that helps people that enjoy saying their ideas out loud instead of typing them down.",
    icon: <Mic className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='voice-button']" },
    ],
  },
  {
    id: 7,
    title: "Why Idea First",
    content: "Something that most YouTubers do wrong, is they jump right into scriptwriting, recording and editing. But just like the idea phase is important, even more crucial is to first do the packaging, before even writing a single word for your script.",
    icon: <Lightbulb className="w-5 h-5" />,
  },
  {
    id: 8,
    title: "Go to Packaging",
    content: "Go ahead and open the packaging tab.",
    icon: <Package className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-packaging']",
  },

  // === 4. PACKAGING PAGE ===
  {
    id: 9,
    title: "Packaging Tab",
    content: "Other than planning out your metadata, the packaging tab allows you to make 6 different sets of titles and thumbnails. When making a video, you wanna make sure you test it as much as possible, to ensure it is something people will want to watch.",
    icon: <Package className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/packaging$/,
    highlights: [
      { selector: "[data-tutorial='sets-section']", label: "1" },
      { selector: "[data-tutorial='metadata-section']", label: "2" },
    ],
  },
  {
    id: 10,
    title: "Create a Set",
    content: "For now, create a simple title, and add any image as a thumbnail. It is for testing purposes only, you can change it later.",
    icon: <Package className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='title-input']", label: "1" },
      { selector: "[data-tutorial='thumbnail-upload']", label: "2" },
    ],
  },
  {
    id: 11,
    title: "Go to Preview",
    content: "Once you have made at least one set, move on to the preview tab.",
    icon: <Eye className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-preview']",
  },

  // === 5. PREVIEW PAGE ===
  {
    id: 12,
    title: "Preview Tab",
    content: "In the preview, you can see how your set will look like on the YouTube platform. But if you wanna compare it to your live competition, simply enable the compare feature. It uses the title of the set to search and show other videos so you can see how exactly your video might look next to them.",
    icon: <Eye className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/preview$/,
    highlights: [
      { selector: "[data-tutorial='compare-toggle']" },
    ],
  },
  {
    id: 13,
    title: "Suggested Videos",
    content: "You can see how your video will look on the home feed, but also in the suggested videos section. Go ahead, switch to the suggested version.",
    icon: <Eye className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='view-feed']", label: "1" },
      { selector: "[data-tutorial='view-suggested']", label: "2" },
    ],
  },
  {
    id: 14,
    title: "Mobile Preview",
    content: "And not only on desktop, but also on mobile. Try it out now! Don't forget, mobile also has feed and suggested. Try them both.",
    icon: <Eye className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='device-desktop']", label: "1" },
      { selector: "[data-tutorial='device-mobile']", label: "2" },
    ],
  },
  {
    id: 15,
    title: "Go to Storyboard",
    content: "Once you have tested several thumbnails, found the one you like the most, and you are certain that this is something that people will want to click on, move on to the storyboard tab.",
    icon: <Layout className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-storyboard']",
  },

  // === 6. STORYBOARD PAGE ===
  {
    id: 16,
    title: "Storyboard",
    content: "This is the storyboard. It is very user-friendly and simple, but extremely important in order to make good videos. Most people write their script, and then they go to recording and editing. This is a trap that has made many YouTuber's exhausted when making videos, and eventually led them to quit.",
    icon: <Layout className="w-5 h-5" />,
    expectedPath: /\/project\/[^/]+\/storyboard$/,
  },
  {
    id: 17,
    title: "Scene Planning",
    content: "The process that big creators use is, while writing the script, to also write what exactly should be shown on screen while that part of the script is being read. That way, all the editor (even if that's still you) has to do is simply add the elements mentioned in the editor notes and match the part of the recording where the script is being read.",
    icon: <Layout className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='scene-script']", label: "Script" },
      { selector: "[data-tutorial='scene-notes']", label: "Editor Notes" },
    ],
  },
  {
    id: 18,
    title: "Multiple Scenes",
    content: "You can also make more scenes. That way, you can split your work into smaller pieces and make it easier to follow how far you have gotten. Of course you can move your scenes to change their order by dragging them or clicking the arrows, or simply delete them.",
    icon: <Layout className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='add-scene']" },
    ],
  },
  {
    id: 19,
    title: "Scene Completion",
    content: "The storyboard also helps you know approximately how long your video will be, as well as the ability to mark off a section as complete, so that the next day when you are ready to continue editing you know exactly where you left off.",
    icon: <Layout className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='scene-duration']", label: "1" },
      { selector: "[data-tutorial='scene-complete']", label: "2" },
    ],
  },
  {
    id: 20,
    title: "Go to Board",
    content: "These are the most important parts of your project. There's also tasks, but we will see those same tasks in the Board page. Go ahead, open it.",
    icon: <Columns3 className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-board']",
  },

  // === 7. BOARD PAGE ===
  {
    id: 21,
    title: "Board Overview",
    content: "This is where all your projects are tracked into stages. Blueprint has the most crucial stages by default, however with the use of the edit button you can add, delete or edit stages, as well the default tasks in each stage.",
    icon: <Columns3 className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/board$/,
    highlights: [
      { selector: "[data-tutorial='board-edit']" },
    ],
  },
  {
    id: 22,
    title: "Moving Projects",
    content: "You can see your active project here. By dragging and dropping, you can change the current stage that your project is in. Go ahead, move it to the \"Package\" stage.",
    icon: <Columns3 className="w-5 h-5" />,
  },
  {
    id: 23,
    title: "Project Tasks",
    content: "If you click on the project it opens the stages with the tasks for each stage that you can check as completed as you go. As mentioned earlier, these tasks are the default suggested tasks, but you can change them to fit your exact process.",
    icon: <CheckSquare className="w-5 h-5" />,
  },
  {
    id: 24,
    title: "Team & Deadlines",
    content: "Additionally if you work in a team you can assign people to the project, or the individual stages, as well as set a deadline for the entire project, and for individual stages.",
    icon: <Users className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='project-assignee']", label: "1" },
      { selector: "[data-tutorial='project-deadline']", label: "2" },
    ],
  },
  {
    id: 25,
    title: "Go to Wiki",
    content: "You can now close the project tasks, and open up the Wiki page.",
    icon: <BookOpen className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-wiki']",
  },

  // === 8. WIKI PAGE ===
  {
    id: 26,
    title: "Wiki",
    content: "The Wiki is a simple concept but is crucial to ensuring not only easy access to all of your important resources, but also to maintaining your branding so that your viewers get used to your style and always recognize your videos. Here you can create a document, or a folder and create documents in it. Go ahead and try it out. Create a document. Name it something like \"Brand Fonts\".",
    icon: <BookOpen className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/wiki/,
    highlights: [
      { selector: "[data-tutorial='wiki-new-doc']", label: "1" },
      { selector: "[data-tutorial='wiki-new-folder']", label: "2" },
    ],
  },
  {
    id: 27,
    title: "Document Editor",
    content: "This is the document. Simple text editor, with basic formatting options. Here you want to keep stuff like, for example, the font you use on your thumbnails. The font you use on your text captions. You can make more documents and save links to sound effects, or background songs you want to use in your videos.",
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: 28,
    title: "Go to Settings",
    content: "Then we have the settings tab. Please open it.",
    icon: <Settings className="w-5 h-5" />,
    clickSelector: "[data-tutorial='nav-settings']",
  },

  // === 9. SETTINGS PAGE ===
  {
    id: 29,
    title: "Settings Overview",
    content: "Here we have studio settings, member settings, and billing settings. In studio settings you can update your studio icon, name and url slug. You can transfer the studio to another user. You can rerun this very tutorial. And you can delete the entire studio. Be careful with this.",
    icon: <Settings className="w-5 h-5" />,
    expectedPath: /\/studio\/[^/]+\/settings/,
    highlights: [
      { selector: "[data-tutorial='settings-studio']", label: "1" },
      { selector: "[data-tutorial='settings-members']", label: "2" },
      { selector: "[data-tutorial='settings-billing']", label: "3" },
    ],
  },
  {
    id: 30,
    title: "Go to Members",
    content: "Move on to the members settings.",
    icon: <Users className="w-5 h-5" />,
    clickSelector: "[data-tutorial='settings-members']",
  },
  {
    id: 31,
    title: "Members Settings",
    content: "Here you can see the members, their roles and you can invite, remove members or edit their roles, if you have the permission for it.",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 32,
    title: "Go to Billing",
    content: "And last is the billing settings. Open it up.",
    icon: <CreditCard className="w-5 h-5" />,
    clickSelector: "[data-tutorial='settings-billing']",
  },
  {
    id: 33,
    title: "Billing Overview",
    content: "Here you can see your billing overview, such as your current billing cycle, and the upcoming one (if there is one).",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: 34,
    title: "Plans & Pricing",
    content: "You can see the options and what they include as well as the prices. Keep in mind, yearly subscriptions are 17% cheaper. Also here you can use a key if you have one to obtain a gifted subscription.",
    icon: <CreditCard className="w-5 h-5" />,
    highlights: [
      { selector: "[data-tutorial='billing-plans']", label: "1" },
      { selector: "[data-tutorial='billing-redeem']", label: "2" },
    ],
  },

  // === 10. PROFILE ===
  {
    id: 35,
    title: "Your Profile",
    content: "Last but not least is your profile. Click on it now. From here you can go back to the hub where you have the list of your studios, you can open your account settings, you can access the help center where there are self help articles, a public forum, as well as the option to contact support. You can also enable or disable the ability to receive invites. And finally the option to sign out.",
    icon: <User className="w-5 h-5" />,
    clickSelector: "[data-tutorial='user-menu']",
  },

  // === DONE ===
  {
    id: 36,
    title: "That's All!",
    content: "That's all for now. Go ahead and get started on your first project.",
    icon: <Play className="w-5 h-5" />,
  },
];

interface StudioTutorialProps {
  studioSlug: string;
  organizationId: string;
  userId: string;
  initialStep: number | null;
}

interface HighlightPosition {
  rect: DOMRect;
  label?: string;
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
  const [highlightPositions, setHighlightPositions] = useState<HighlightPosition[]>([]);
  const [clickRect, setClickRect] = useState<DOMRect | null>(null);
  
  // Track previous pathname to only auto-advance on actual navigation
  const prevPathnameRef = useRef<string>(pathname);

  // Update highlight positions when step changes
  useEffect(() => {
    const step = TUTORIAL_STEPS[currentStep ?? 0];
    if (!isVisible) {
      setHighlightPositions([]);
      setClickRect(null);
      return;
    }

    const updateHighlights = () => {
      // Info highlights (blue) - can be multiple with labels
      if (step?.highlights && step.highlights.length > 0) {
        const positions: HighlightPosition[] = [];
        for (const highlight of step.highlights) {
          const element = document.querySelector(highlight.selector);
          if (element) {
            positions.push({
              rect: element.getBoundingClientRect(),
              label: highlight.label,
            });
          }
        }
        setHighlightPositions(positions);
      } else {
        setHighlightPositions([]);
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

  // Auto-advance when user navigates to expected path (only on actual navigation)
  useEffect(() => {
    if (!isVisible || currentStep === null) return;
    
    // Only auto-advance when pathname actually changed (prevents cascade)
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    
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
      {/* Info highlights - blue border with optional labels */}
      {highlightPositions.map((pos, index) => (
        <div key={index}>
          <div
            className="fixed border-2 border-blue-400/80 rounded-lg pointer-events-none z-[99]"
            style={{
              left: pos.rect.left - 4,
              top: pos.rect.top - 4,
              width: pos.rect.width + 8,
              height: pos.rect.height + 8,
            }}
          />
          {/* Label badge */}
          {pos.label && (
            <div
              className="fixed bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-[100] shadow-lg"
              style={{
                left: pos.rect.left - 10,
                top: pos.rect.top - 10,
              }}
            >
              {pos.label}
            </div>
          )}
        </div>
      ))}

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
