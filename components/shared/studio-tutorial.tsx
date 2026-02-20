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
  Play,
  LucideIcon
} from "lucide-react";
import tutorialStepsData from "@/config/tutorial-steps.json";

// Icon mapping from string names to components
const ICONS: Record<string, LucideIcon> = {
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
  Play,
};

interface HighlightItem {
  selector: string;
  label?: string;
  isGroup?: boolean;
}

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  expectedPath?: RegExp;
  highlights?: HighlightItem[];
  clickSelector?: string;
  clickSelectors?: string[];
  autoAdvanceOnClick?: string;
  autoAdvanceOnInput?: string;
}

// Convert JSON data to TutorialStep objects
const TUTORIAL_STEPS: TutorialStep[] = tutorialStepsData.steps.map((step) => {
  const IconComponent = ICONS[step.icon] || Home;
  return {
    id: step.id,
    title: step.title,
    content: step.content,
    icon: <IconComponent className="w-5 h-5" />,
    expectedPath: step.expectedPath ? new RegExp(step.expectedPath) : undefined,
    highlights: step.highlights,
    clickSelector: step.clickSelector,
    clickSelectors: (step as any).clickSelectors,
    autoAdvanceOnInput: (step as any).autoAdvanceOnInput,
    autoAdvanceOnClick: step.autoAdvanceOnClick,
  };
});

interface StudioTutorialProps {
  studioSlug: string;
  organizationId: string;
  userId: string;
  initialStep: number | null;
  tutorialCompletedAt: string | null;
}

interface HighlightPosition {
  rect: DOMRect;
  label?: string;
}

// Helper to get combined bounding box for multiple elements
function getCombinedRect(elements: Element[]): DOMRect | null {
  if (elements.length === 0) return null;
  
  const rects = elements.map(el => el.getBoundingClientRect());
  const left = Math.min(...rects.map(r => r.left));
  const top = Math.min(...rects.map(r => r.top));
  const right = Math.max(...rects.map(r => r.right));
  const bottom = Math.max(...rects.map(r => r.bottom));
  
  return new DOMRect(left, top, right - left, bottom - top);
}

// Helper to check if an element is visible
function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         rect.width > 0 && 
         rect.height > 0;
}

// Helper to find first visible element matching selector
function queryVisibleElement(selector: string): Element | null {
  const elements = document.querySelectorAll(selector);
  for (const el of elements) {
    if (isElementVisible(el)) {
      return el;
    }
  }
  return null;
}

export function StudioTutorial({ 
  studioSlug, 
  organizationId, 
  userId, 
  initialStep,
  tutorialCompletedAt,
}: StudioTutorialProps) {
  const pathname = usePathname();
  const supabase = createClient();
  
  // Detect mobile - tutorial is desktop only
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if mobile on mount (window not available during SSR)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Use localStorage as fallback for step persistence (handles refresh/tab close)
  const getStoredStep = () => {
    if (typeof window === 'undefined') return initialStep;
    const key = `tutorial-step-${organizationId}-${userId}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      // Use stored value if it's higher than server value (more recent progress)
      if (!isNaN(parsed) && (initialStep === null || parsed > initialStep)) {
        return parsed;
      }
    }
    return initialStep;
  };
  
  const [currentStep, setCurrentStep] = useState<number | null>(getStoredStep);
  // Only show welcome if: never started (initialStep null), never completed (tutorialCompletedAt null), and not mobile
  const [showWelcome, setShowWelcome] = useState(initialStep === null && tutorialCompletedAt === null && getStoredStep() === null);
  const [isVisible, setIsVisible] = useState(() => {
    const step = getStoredStep();
    return step !== null && step >= 0 && step < TUTORIAL_STEPS.length;
  });
  const [highlightPositions, setHighlightPositions] = useState<HighlightPosition[]>([]);
  const [clickRect, setClickRect] = useState<DOMRect | null>(null);
  const [offScreenDirection, setOffScreenDirection] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  
  // Track previous pathname to only auto-advance on actual navigation
  const prevPathnameRef = useRef<string>(pathname);
  
  // Track if we've auto-advanced from a click (prevent double-advance)
  const hasAutoAdvancedRef = useRef(false);

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
          if (highlight.isGroup) {
            // Group highlight - combine all matching VISIBLE elements
            const elements = Array.from(document.querySelectorAll(highlight.selector)).filter(isElementVisible);
            const combinedRect = getCombinedRect(elements);
            if (combinedRect) {
              positions.push({
                rect: combinedRect,
                label: highlight.label,
              });
            }
          } else {
            // Single element highlight - find first VISIBLE element
            const element = queryVisibleElement(highlight.selector);
            if (element) {
              positions.push({
                rect: element.getBoundingClientRect(),
                label: highlight.label,
              });
            }
          }
        }
        setHighlightPositions(positions);
        
        // Check if any highlight is off-screen and determine direction
        if (positions.length > 0) {
          const firstPos = positions[0].rect;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          if (firstPos.bottom < 0) {
            setOffScreenDirection('top');
          } else if (firstPos.top > viewportHeight) {
            setOffScreenDirection('bottom');
          } else if (firstPos.right < 0) {
            setOffScreenDirection('left');
          } else if (firstPos.left > viewportWidth) {
            setOffScreenDirection('right');
          } else {
            setOffScreenDirection(null);
          }
        } else {
          setOffScreenDirection(null);
        }
      } else {
        setHighlightPositions([]);
        setOffScreenDirection(null);
      }

      // Click highlight (blue pulsing) - can be single or from clickSelectors
      let clickRectValue: DOMRect | null = null;
      if (step?.clickSelector) {
        const element = queryVisibleElement(step.clickSelector);
        if (element) {
          clickRectValue = element.getBoundingClientRect();
          setClickRect(clickRectValue);
        } else {
          setClickRect(null);
        }
      } else if (step?.clickSelectors && step.clickSelectors.length > 0) {
        // For multiple click targets, use the first VISIBLE one found
        for (const selector of step.clickSelectors) {
          const element = queryVisibleElement(selector);
          if (element) {
            clickRectValue = element.getBoundingClientRect();
            setClickRect(clickRectValue);
            break;
          }
        }
      } else {
        setClickRect(null);
      }

      // Check off-screen for click highlights if no info highlights
      const hasInfoHighlights = step?.highlights && step.highlights.length > 0;
      if (!hasInfoHighlights && clickRectValue) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (clickRectValue.bottom < 0) {
          setOffScreenDirection('top');
        } else if (clickRectValue.top > viewportHeight) {
          setOffScreenDirection('bottom');
        } else if (clickRectValue.right < 0) {
          setOffScreenDirection('left');
        } else if (clickRectValue.left > viewportWidth) {
          setOffScreenDirection('right');
        } else {
          setOffScreenDirection(null);
        }
      }
    };

    updateHighlights();
    const interval = setInterval(updateHighlights, 100); // More frequent updates for smoother scrolling
    window.addEventListener("resize", updateHighlights);
    window.addEventListener("scroll", updateHighlights, true); // Capture scroll events
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateHighlights);
      window.removeEventListener("scroll", updateHighlights, true);
    };
  }, [currentStep, isVisible, pathname]);

  // Click detection for auto-advancing
  useEffect(() => {
    if (!isVisible || currentStep === null) return;
    
    const step = TUTORIAL_STEPS[currentStep];
    
    // Handle autoAdvanceOnClick
    if (step?.autoAdvanceOnClick) {
      const handleClick = (e: Event) => {
        const target = e.target as Element;
        const clickedElement = target.closest(step.autoAdvanceOnClick!);
        if (clickedElement) {
          hasAutoAdvancedRef.current = true;
          setTimeout(() => {
            handleNext();
            hasAutoAdvancedRef.current = false;
          }, 100);
        }
      };
      
      document.addEventListener("pointerdown", handleClick, true);
      return () => document.removeEventListener("pointerdown", handleClick, true);
    }
    
    // Handle clickSelectors (any of them advances)
    if (step?.clickSelectors && step.clickSelectors.length > 0) {
      const handleClick = (e: Event) => {
        const target = e.target as Element;
        for (const selector of step.clickSelectors!) {
          const clickedElement = target.closest(selector);
          if (clickedElement) {
            hasAutoAdvancedRef.current = true;
            setTimeout(() => {
              handleNext();
              hasAutoAdvancedRef.current = false;
            }, 100);
            break;
          }
        }
      };
      
      document.addEventListener("pointerdown", handleClick, true);
      return () => document.removeEventListener("pointerdown", handleClick, true);
    }
    
    // Handle single clickSelector - use pointerdown for better detection with dropdowns
    if (step?.clickSelector) {
      const handleClick = (e: Event) => {
        const target = e.target as Element;
        // Check if clicked element or any ancestor matches the selector
        const clickedElement = target.closest(step.clickSelector!);
        // Also check if the click was on the element itself (for elements that contain the click)
        const directMatch = document.querySelector(step.clickSelector!)?.contains(target);
        
        if (clickedElement || directMatch) {
          // wiki-new-doc should NOT advance (dialog opens first)
          const isWikiNewDoc = step.clickSelector!.includes("wiki-new-doc");
          
          if (!isWikiNewDoc) {
            hasAutoAdvancedRef.current = true;
            setTimeout(() => {
              handleNext();
              hasAutoAdvancedRef.current = false;
            }, 150); // Slightly longer delay for navigation
          }
        }
      };
      
      // Use pointerdown instead of click - fires before dropdown menu takes over
      document.addEventListener("pointerdown", handleClick, true);
      return () => document.removeEventListener("pointerdown", handleClick, true);
    }
  }, [currentStep, isVisible]);

  // Input detection for auto-advancing on text input
  useEffect(() => {
    if (!isVisible || currentStep === null) return;
    
    const step = TUTORIAL_STEPS[currentStep];
    if (!step?.autoAdvanceOnInput) return;
    
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const inputElement = target.closest(step.autoAdvanceOnInput!);
      if (inputElement && target.value.length > 0) {
        hasAutoAdvancedRef.current = true;
        setTimeout(() => {
          handleNext();
          hasAutoAdvancedRef.current = false;
        }, 500); // Give them time to type a bit
      }
    };
    
    document.addEventListener("input", handleInput, true);
    return () => document.removeEventListener("input", handleInput, true);
  }, [currentStep, isVisible]);

  // Auto-advance when user navigates to expected path (only on actual navigation)
  useEffect(() => {
    if (!isVisible || currentStep === null || hasAutoAdvancedRef.current) return;
    
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
    
    // Save to localStorage for immediate persistence across refresh
    const key = `tutorial-step-${organizationId}-${userId}`;
    if (isCompleted) {
      localStorage.setItem(key, TUTORIAL_STEPS.length.toString());
    } else if (step !== null) {
      localStorage.setItem(key, step.toString());
    }
    
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

  // Welcome prompt - desktop only
  if (showWelcome && !isVisible && !isMobile) {
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

  // Hide tutorial on mobile or when not visible
  if (!isVisible || isMobile) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep ?? 0];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const hasClickAction = step.clickSelector || (step.clickSelectors && step.clickSelectors.length > 0) || step.autoAdvanceOnClick;

  return (
    <>
      {/* Info highlights - blue border with optional labels, smooth transitions */}
      {highlightPositions.map((pos, index) => (
        <div key={index}>
          <div
            className="fixed border-2 border-blue-400/80 rounded-lg pointer-events-none z-[99] transition-all duration-150 ease-out"
            style={{
              left: pos.rect.left - 10,
              top: pos.rect.top - 10,
              width: pos.rect.width + 20,
              height: pos.rect.height + 20,
            }}
          />
          {/* Label badge */}
          {pos.label && (
            <div
              className="fixed bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-[100] shadow-lg transition-all duration-150 ease-out"
              style={{
                left: pos.rect.left - 16,
                top: pos.rect.top - 16,
              }}
            >
              {pos.label}
            </div>
          )}
        </div>
      ))}

      {/* Off-screen indicator arrow */}
      {offScreenDirection && (
        <div
          className="fixed z-[100] pointer-events-none animate-bounce"
          style={{
            ...(offScreenDirection === 'top' && { top: 72, left: '50%', transform: 'translateX(-50%)' }),
            ...(offScreenDirection === 'bottom' && { bottom: 88, left: '50%', transform: 'translateX(-50%)' }),
            ...(offScreenDirection === 'left' && { left: 72, top: '50%', transform: 'translateY(-50%)' }),
            ...(offScreenDirection === 'right' && { right: 16, top: '50%', transform: 'translateY(-50%)' }),
          }}
        >
          <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg ring-4 ring-blue-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{
                transform: offScreenDirection === 'top' ? 'rotate(-90deg)' :
                           offScreenDirection === 'bottom' ? 'rotate(90deg)' :
                           offScreenDirection === 'left' ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Click highlight - blue pulsing ring with slow thicken/slim effect */}
      {clickRect && (
        <div
          className="fixed rounded-lg pointer-events-none z-[99] transition-all duration-150 ease-out"
          style={{
            left: clickRect.left - 6,
            top: clickRect.top - 6,
            width: clickRect.width + 12,
            height: clickRect.height + 12,
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.8)',
            animation: 'tutorial-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* CSS for slow pulse animation */}
      <style jsx global>{`
        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.9);
          }
        }
      `}</style>

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
        {hasClickAction && (
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
            ) : hasClickAction ? (
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
    
    // Clear localStorage backup so it doesn't override the reset
    localStorage.removeItem(`tutorial-step-${organizationId}-${userId}`);
    
    window.location.href = `/studio/${studioSlug}`;
  };

  return (
    <Button variant="outline" onClick={handleStartTutorial} className={className}>
      Restart Tutorial
    </Button>
  );
}
