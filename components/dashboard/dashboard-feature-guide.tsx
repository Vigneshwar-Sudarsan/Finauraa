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
  Wallet,
  Receipt,
  ChartPie,
  Target,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Guide steps for dashboard bottom nav
type DashboardGuideStepId =
  | "dash-accounts"
  | "dash-transactions"
  | "dash-spending"
  | "dash-goals";

interface DashboardGuideStep {
  id: DashboardGuideStepId;
  title: string;
  description: string;
  icon: typeof Wallet;
  iconColor: string;
  iconBg: string;
}

const DASHBOARD_GUIDE_STEPS: DashboardGuideStep[] = [
  {
    id: "dash-accounts",
    title: "Your accounts",
    description:
      "View all your connected bank accounts and their balances in one place.",
    icon: Wallet,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "dash-transactions",
    title: "Transactions",
    description:
      "Browse and search through all your transactions across accounts.",
    icon: Receipt,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
  },
  {
    id: "dash-spending",
    title: "Spending insights",
    description:
      "Analyze your spending patterns, set budgets, and track where your money goes.",
    icon: ChartPie,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-500/10",
  },
  {
    id: "dash-goals",
    title: "Savings goals",
    description:
      "Create and track savings goals. Watch your progress as you save toward your dreams.",
    icon: Target,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
];

// Context for the dashboard feature guide
interface DashboardGuideContextType {
  isActive: boolean;
  currentStep: number;
  currentStepId: DashboardGuideStepId | null;
  totalSteps: number;
  next: () => void;
  previous: () => void;
  skip: () => void;
}

const DashboardGuideContext = createContext<DashboardGuideContextType | null>(null);

// Provider component
interface DashboardGuideProviderProps {
  children: ReactNode;
}

export function DashboardGuideProvider({
  children,
}: DashboardGuideProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size - only show on mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch guide status from API
  useEffect(() => {
    const checkGuideStatus = async () => {
      setIsMounted(true);

      // Only show on mobile
      if (!isMobile) {
        setIsLoading(false);
        return;
      }

      // Check for ?dashboard-guide=1 URL param for easy testing
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.get("dashboard-guide") === "1";

      if (showFromUrl) {
        // Reset guide in database when force showing
        try {
          await fetch("/api/user/feature-guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seen: false, type: "dashboard" }),
          });
        } catch (e) {
          console.error("Failed to reset dashboard guide:", e);
        }
        // Clean up URL
        urlParams.delete("dashboard-guide");
        const newUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        setIsActive(true);
        setIsLoading(false);
        return;
      }

      // Check database for guide status
      try {
        const response = await fetch("/api/user/feature-guide?type=dashboard");
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
        console.error("Failed to check dashboard guide status:", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isMounted) {
      checkGuideStatus();
    } else {
      setIsMounted(true);
    }
  }, [isMobile, isMounted]);

  // Mark guide as seen in database
  const markGuideSeen = useCallback(async () => {
    try {
      await fetch("/api/user/feature-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: true, type: "dashboard" }),
      });
    } catch (e) {
      console.error("Failed to save dashboard guide status:", e);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    markGuideSeen();
    setIsActive(false);
    setCurrentStep(0);
  }, [markGuideSeen]);

  const next = useCallback(() => {
    if (currentStep < DASHBOARD_GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  }, [currentStep, handleDismiss]);

  const previous = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const currentStepId = isActive ? DASHBOARD_GUIDE_STEPS[currentStep]?.id : null;

  if (!isMounted || isLoading) {
    return <>{children}</>;
  }

  return (
    <DashboardGuideContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepId,
        totalSteps: DASHBOARD_GUIDE_STEPS.length,
        next,
        previous,
        skip: handleDismiss,
      }}
    >
      {/* Overlay when guide is active */}
      {isActive && isMobile && (
        <div
          className="fixed inset-0 z-[99] bg-black/30 animate-in fade-in duration-200"
          onClick={handleDismiss}
        />
      )}
      {children}
    </DashboardGuideContext.Provider>
  );
}

// Hook to use the dashboard guide context
export function useDashboardGuideContext() {
  return useContext(DashboardGuideContext);
}

// Wrapper component for each guideable element
interface DashboardGuideSpotProps {
  id: DashboardGuideStepId;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function DashboardGuideSpot({
  id,
  children,
  side = "top",
  align = "center",
}: DashboardGuideSpotProps) {
  const context = useDashboardGuideContext();

  if (!context) {
    return <>{children}</>;
  }

  const { isActive, currentStepId, currentStep, totalSteps, next, previous, skip } =
    context;
  const isCurrentStep = isActive && currentStepId === id;
  const stepInfo = DASHBOARD_GUIDE_STEPS.find((s) => s.id === id);

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
            {DASHBOARD_GUIDE_STEPS.map((_, index) => (
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

// Hook to manage the dashboard guide from settings
export function useDashboardGuide() {
  const [isResetting, setIsResetting] = useState(false);

  const showGuide = useCallback(async () => {
    if (typeof window === "undefined") return;

    setIsResetting(true);
    try {
      await fetch("/api/user/feature-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: false, type: "dashboard" }),
      });
      // Navigate to dashboard to show the guide
      window.location.href = "/dashboard/accounts";
    } catch (e) {
      console.error("Failed to reset dashboard guide:", e);
      setIsResetting(false);
    }
  }, []);

  return { showGuide, isResetting };
}
