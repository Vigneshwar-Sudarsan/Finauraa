"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  X,
  ChartPieSlice,
  Plus,
  ClockCounterClockwise,
  ChatCircle,
  List,
  Wallet,
  Receipt,
  Target,
  Gear,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Guide steps configuration
type GuideStepId =
  | "sidebar-menu"
  | "new-chat"
  | "history"
  | "dashboard-switch"
  | "chat-input"
  | "nav-accounts"
  | "nav-transactions"
  | "nav-spending"
  | "nav-goals"
  | "nav-settings";

interface GuideStep {
  id: GuideStepId;
  title: string;
  description: string;
  icon: typeof ChartPieSlice;
  iconColor: string;
  iconBg: string;
}

// Steps that require sidebar (desktop only)
const SIDEBAR_STEP_IDS: GuideStepId[] = [
  "nav-accounts",
  "nav-transactions",
  "nav-spending",
  "nav-goals",
  "nav-settings",
];

const ALL_GUIDE_STEPS: GuideStep[] = [
  {
    id: "sidebar-menu",
    title: "Navigation menu",
    description:
      "Tap to open the sidebar menu with all navigation options.",
    icon: List,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
  },
  {
    id: "nav-accounts",
    title: "Your accounts",
    description:
      "View all your connected bank accounts and their balances in one place.",
    icon: Wallet,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "nav-transactions",
    title: "Transactions",
    description:
      "Browse and search through all your transactions across accounts.",
    icon: Receipt,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
  },
  {
    id: "nav-spending",
    title: "Spending insights",
    description:
      "Analyze your spending patterns, set budgets, and track where your money goes.",
    icon: ChartPieSlice,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-500/10",
  },
  {
    id: "nav-goals",
    title: "Savings goals",
    description:
      "Create and track savings goals. Watch your progress as you save toward your dreams.",
    icon: Target,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    id: "nav-settings",
    title: "Settings",
    description:
      "Manage your profile, connected banks, notifications, and preferences.",
    icon: Gear,
    iconColor: "text-slate-500",
    iconBg: "bg-slate-500/10",
  },
  {
    id: "new-chat",
    title: "Start new conversation",
    description:
      "Tap the plus icon to start a fresh conversation with the AI assistant.",
    icon: Plus,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
  {
    id: "history",
    title: "Conversation history",
    description: "View and continue your previous conversations anytime.",
    icon: ClockCounterClockwise,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
  },
  {
    id: "dashboard-switch",
    title: "Switch to dashboard",
    description:
      "Tap this icon to switch between AI chat and the traditional dashboard view.",
    icon: ChartPieSlice,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    id: "chat-input",
    title: "Ask anything",
    description:
      "Type your questions here. Ask about spending, budgets, savings goals, or get financial advice.",
    icon: ChatCircle,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
];

// Helper to get steps based on screen size
const getStepsForScreenSize = (isDesktop: boolean): GuideStep[] => {
  if (isDesktop) {
    return ALL_GUIDE_STEPS;
  }
  // On mobile, filter out sidebar-only steps and update sidebar-menu description
  return ALL_GUIDE_STEPS
    .filter((step) => !SIDEBAR_STEP_IDS.includes(step.id))
    .map((step) => {
      if (step.id === "sidebar-menu") {
        return {
          ...step,
          description: "Open the menu to access accounts, transactions, spending, goals, and settings.",
        };
      }
      return step;
    });
};

// Context for the feature guide
interface FeatureGuideContextType {
  isActive: boolean;
  currentStep: number;
  currentStepId: GuideStepId | null;
  totalSteps: number;
  next: () => void;
  previous: () => void;
  skip: () => void;
  forceShow: boolean;
  guideSteps: GuideStep[];
}

const FeatureGuideContext = createContext<FeatureGuideContextType | null>(null);

// Provider component
interface FeatureGuideProviderProps {
  children: ReactNode;
  forceShow?: boolean;
  onDismiss?: () => void;
}

export function FeatureGuideProvider({
  children,
  forceShow = false,
  onDismiss,
}: FeatureGuideProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  // Get the appropriate steps for current screen size
  const guideSteps = getStepsForScreenSize(isDesktop);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch guide status from API
  useEffect(() => {
    const checkGuideStatus = async () => {
      setIsMounted(true);

      // Check for ?guide=1 URL param for easy testing
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.get("guide") === "1";

      if (forceShow || showFromUrl) {
        // Reset guide in database when force showing
        if (showFromUrl) {
          try {
            await fetch("/api/user/feature-guide", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seen: false }),
            });
          } catch (e) {
            console.error("Failed to reset guide:", e);
          }
          // Clean up URL
          urlParams.delete("guide");
          const newUrl = urlParams.toString()
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
        setIsActive(true);
        setIsLoading(false);
        return;
      }

      // Check database for guide status
      try {
        const response = await fetch("/api/user/feature-guide");
        if (response.ok) {
          const data = await response.json();
          if (!data.hasSeenGuide) {
            // Delay showing the guide slightly for better UX
            setTimeout(() => {
              setIsActive(true);
            }, 800);
          }
        }
      } catch (e) {
        console.error("Failed to check guide status:", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkGuideStatus();
  }, [forceShow]);

  // Mark guide as seen in database
  const markGuideSeen = useCallback(async () => {
    try {
      await fetch("/api/user/feature-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: true }),
      });
    } catch (e) {
      console.error("Failed to save guide status:", e);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    markGuideSeen();
    setIsActive(false);
    setCurrentStep(0);
    onDismiss?.();
  }, [markGuideSeen, onDismiss]);

  const next = useCallback(() => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  }, [currentStep, guideSteps.length, handleDismiss]);

  const previous = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const currentStepId = isActive ? guideSteps[currentStep]?.id : null;

  if (!isMounted || isLoading) {
    return <>{children}</>;
  }

  return (
    <FeatureGuideContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepId,
        totalSteps: guideSteps.length,
        next,
        previous,
        skip: handleDismiss,
        forceShow,
        guideSteps,
      }}
    >
      {/* Overlay when guide is active */}
      {isActive && (
        <div
          className="fixed inset-0 z-[99] bg-black/30 animate-in fade-in duration-200"
          onClick={handleDismiss}
        />
      )}
      {children}
    </FeatureGuideContext.Provider>
  );
}

// Hook to use the guide context
export function useFeatureGuideContext() {
  return useContext(FeatureGuideContext);
}

// Wrapper component for each guideable element
interface GuideSpotProps {
  id: GuideStepId;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function GuideSpot({
  id,
  children,
  side = "bottom",
  align = "center",
}: GuideSpotProps) {
  const context = useFeatureGuideContext();

  if (!context) {
    return <>{children}</>;
  }

  const { isActive, currentStepId, currentStep, totalSteps, next, previous, skip, guideSteps } =
    context;
  const isCurrentStep = isActive && currentStepId === id;
  const stepInfo = guideSteps.find((s) => s.id === id);

  if (!stepInfo) {
    return <>{children}</>;
  }

  const Icon = stepInfo.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Popover open={isCurrentStep}>
      <PopoverTrigger asChild>
        <div
          className={
            isCurrentStep
              ? "relative z-[101] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse [&_svg]:text-foreground [&_span]:text-foreground"
              : ""
          }
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-0 z-[102]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header with step indicator */}
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={skip}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Icon */}
          <div
            className={`size-10 rounded-xl ${stepInfo.iconBg} flex items-center justify-center mb-3`}
          >
            <Icon size={20} weight="fill" className={stepInfo.iconColor} />
          </div>

          <h3 className="text-sm font-semibold mb-1">{stepInfo.title}</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stepInfo.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {guideSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={previous}
                className="flex-1 h-8 text-xs"
              >
                Back
              </Button>
            )}
            {isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skip}
                className="flex-1 h-8 text-xs text-muted-foreground"
              >
                Skip
              </Button>
            )}
            <Button size="sm" onClick={next} className="flex-1 h-8 text-xs">
              {isLastStep ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Legacy component for backward compatibility (just the provider now)
interface FeatureGuideProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function FeatureGuide({ onDismiss, forceShow = false }: FeatureGuideProps) {
  // This is now a no-op - the guide is controlled by FeatureGuideProvider
  // Keep for backward compatibility
  return null;
}

// Hook to manage the feature guide from settings
export function useFeatureGuide() {
  const [isResetting, setIsResetting] = useState(false);

  const resetGuide = useCallback(async () => {
    try {
      await fetch("/api/user/feature-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: false }),
      });
    } catch (e) {
      console.error("Failed to reset guide:", e);
    }
  }, []);

  const showGuide = useCallback(async () => {
    if (typeof window === "undefined") return;

    setIsResetting(true);
    try {
      await fetch("/api/user/feature-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: false }),
      });
      // Navigate to home page to show the guide
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to reset guide:", e);
      setIsResetting(false);
    }
  }, []);

  const checkHasSeenGuide = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/user/feature-guide");
      if (response.ok) {
        const data = await response.json();
        return data.hasSeenGuide;
      }
    } catch (e) {
      console.error("Failed to check guide status:", e);
    }
    return true; // Default to true if check fails
  }, []);

  return { resetGuide, showGuide, checkHasSeenGuide, isResetting };
}
