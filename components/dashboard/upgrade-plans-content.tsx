"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Crown,
  Check,
  X,
  SpinnerGap,
  CheckCircle,
  ArrowDown,
  ArrowUp,
} from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Plan features configuration (prices in USD)
const planFeatures = {
  free: {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out",
    features: [
      { text: "1 bank connection", included: true },
      { text: "30 days transaction history", included: true },
      { text: "5 AI queries per month", included: true },
      { text: "Basic spending insights", included: true },
      { text: "1 savings goal", included: true },
      { text: "Manual sync only", included: true },
      { text: "Data export", included: false },
      { text: "Family sharing", included: false },
    ],
  },
  pro: {
    name: "Pro",
    price: 7.99,
    period: "month",
    description: "For singles & couples",
    popular: true,
    annualPrice: 79.99,
    features: [
      { text: "5 bank connections", included: true },
      { text: "Unlimited transaction history", included: true },
      { text: "100 AI queries per month", included: true },
      { text: "Advanced spending insights", included: true },
      { text: "Unlimited savings goals", included: true },
      { text: "Daily auto sync", included: true },
      { text: "CSV & PDF export", included: true },
      { text: "Budget alerts & notifications", included: true },
      { text: "Priority support", included: true },
      { text: "Family sharing", included: false },
    ],
  },
  family: {
    name: "Family",
    price: 15.99,
    period: "month",
    description: "For the whole family",
    annualPrice: 159.99,
    features: [
      { text: "15 bank connections (shared)", included: true },
      { text: "Unlimited transaction history", included: true },
      { text: "200 AI queries per month (shared)", included: true },
      { text: "Advanced spending insights", included: true },
      { text: "Unlimited savings goals", included: true },
      { text: "Daily auto sync", included: true },
      { text: "CSV & PDF export", included: true },
      { text: "Budget alerts & notifications", included: true },
      { text: "Priority support", included: true },
      { text: "Up to 7 family members", included: true },
      { text: "Family spending dashboard", included: true },
    ],
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function UpgradePlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTier, setCurrentTier] = useState<"free" | "pro" | "family">("free");
  const [currentBillingCycle, setCurrentBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("active");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showBillingChangeDialog, setShowBillingChangeDialog] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  // Check for canceled checkout
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.warning("Checkout canceled", {
        description: "No worries! You can upgrade anytime when you're ready.",
      });
      // Clear the URL parameter
      router.replace("/dashboard/settings/subscription/plans", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription");
        if (response.ok) {
          const data = await response.json();
          setCurrentTier(data.subscription.tier);
          setSubscriptionStatus(data.subscription.status);
          setCurrentBillingCycle(data.subscription.billingCycle || "monthly");
          // Set the toggle to match current billing cycle
          setIsAnnual(data.subscription.billingCycle === "yearly");
          // User has active subscription if not on free tier and not canceled
          setHasActiveSubscription(
            data.subscription.tier !== "free" &&
            data.subscription.status !== "canceled"
          );
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleSelectPlan = async (plan: string) => {
    if (plan === "free") return; // Can't select free plan, use cancel instead

    const selectedBilling = isAnnual ? "yearly" : "monthly";
    const isSamePlan = plan === currentTier;
    const isBillingChange = selectedBilling !== currentBillingCycle;

    // If same plan but different billing cycle, handle billing cycle change
    if (isSamePlan && isBillingChange && hasActiveSubscription) {
      setPendingPlan(plan);
      setShowBillingChangeDialog(true);
      return;
    }

    // If same plan and same billing, do nothing
    if (isSamePlan && !isBillingChange) return;

    // Check if this is a downgrade
    const tierOrder = { free: 0, pro: 1, family: 2 };
    const isDowngrade = tierOrder[plan as keyof typeof tierOrder] < tierOrder[currentTier];

    // If downgrading, show confirmation dialog
    if (isDowngrade && hasActiveSubscription) {
      setPendingPlan(plan);
      setShowDowngradeDialog(true);
      return;
    }

    await processSubscriptionChange(plan);
  };

  const processSubscriptionChange = async (plan: string) => {
    setIsUpgrading(true);
    setSelectedPlan(plan);

    try {
      // If user has an active subscription, use change-plan endpoint
      // Otherwise, use checkout endpoint for new subscriptions
      if (hasActiveSubscription) {
        const response = await fetch("/api/subscription/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billing: isAnnual ? "yearly" : "monthly" }),
        });

        const data = await response.json();

        if (response.ok) {
          // Redirect to subscription page with success message
          router.push("/dashboard/settings/subscription?success=true");
        } else {
          // If change-plan fails because no subscription exists, try checkout
          if (data.redirectTo === "/api/subscription/checkout") {
            await processNewCheckout(plan);
          } else if (data.redirectTo === "/api/subscription/change-billing") {
            // Same plan but different billing - use change-billing endpoint
            await processBillingChange();
          } else {
            toast.error(data.error || "Failed to change plan");
          }
        }
      } else {
        await processNewCheckout(plan);
      }
    } catch (error) {
      console.error("Failed to process subscription:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const processBillingChange = async () => {
    try {
      const newBilling = isAnnual ? "yearly" : "monthly";
      const response = await fetch("/api/subscription/change-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: newBilling }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard/settings/subscription?success=true");
      } else {
        toast.error(data.error || "Failed to change billing cycle");
      }
    } catch (error) {
      console.error("Failed to change billing cycle:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const processNewCheckout = async (plan: string) => {
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: isAnnual ? "yearly" : "monthly" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          toast.error("No checkout URL returned");
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (err) {
      console.error("Checkout fetch error:", err);
      toast.error("Network error. Please try again.");
    }
  };

  const handleDowngradeConfirm = async () => {
    setShowDowngradeDialog(false);
    if (pendingPlan) {
      await processSubscriptionChange(pendingPlan);
      setPendingPlan(null);
    }
  };

  const handleBillingChangeConfirm = async () => {
    setShowBillingChangeDialog(false);
    setIsUpgrading(true);
    setSelectedPlan(pendingPlan);

    try {
      const newBilling = isAnnual ? "yearly" : "monthly";
      const response = await fetch("/api/subscription/change-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: newBilling }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard/settings/subscription?success=true");
      } else {
        toast.error(data.error || "Failed to change billing cycle");
      }
    } catch (error) {
      console.error("Failed to change billing cycle:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
      setPendingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <SpinnerGap size={20} className="animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowDown size={20} className="text-yellow-500" />
              Downgrade Plan?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to downgrade to the {pendingPlan && planFeatures[pendingPlan as keyof typeof planFeatures]?.name} plan.
              Your new plan will take effect immediately, but you&apos;ll receive a prorated credit for the unused time on your current plan.
              <br /><br />
              <strong>Note:</strong> Some features may become unavailable. If you exceed the limits of the new plan, some functionality may be restricted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPlan(null)}>
              Keep Current Plan
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDowngradeConfirm}>
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Cycle Change Confirmation Dialog */}
      <AlertDialog open={showBillingChangeDialog} onOpenChange={setShowBillingChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isAnnual ? (
                <>
                  <ArrowUp size={20} className="text-green-500" />
                  Switch to Yearly Billing?
                </>
              ) : (
                <>
                  <ArrowDown size={20} className="text-yellow-500" />
                  Switch to Monthly Billing?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAnnual ? (
                <>
                  You&apos;re about to switch to yearly billing for your {planFeatures[currentTier]?.name} plan.
                  A prorated amount will be charged to your payment method.
                  <br /><br />
                  <strong className="text-green-600">You&apos;ll save 17% with annual billing!</strong>
                </>
              ) : (
                <>
                  You&apos;re about to switch to monthly billing for your {planFeatures[currentTier]?.name} plan.
                  The unused portion of your yearly subscription will be credited to your account.
                  <br /><br />
                  <strong>Note:</strong> This credit will offset your future monthly charges.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingPlan(null);
              // Reset toggle to current billing
              setIsAnnual(currentBillingCycle === "yearly");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBillingChangeConfirm}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Title */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 mb-4">
          <Crown size={24} className="text-primary" weight="fill" />
        </div>
        <h1 className="text-2xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-1">
          Select the plan that best fits your financial management needs
        </p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="billing-toggle"
          className={cn("text-sm cursor-pointer", !isAnnual && "font-medium")}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label
          htmlFor="billing-toggle"
          className={cn("text-sm cursor-pointer flex items-center gap-2", isAnnual && "font-medium")}
        >
          Annual
          <Badge variant="secondary" className="text-xs">Save 17%</Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {(Object.entries(planFeatures) as [keyof typeof planFeatures, typeof planFeatures.free][]).map(([key, plan]) => {
          const isCurrentPlan = currentTier === key;
          const isPlanPopular = key === "pro";
          const tierOrder = { free: 0, pro: 1, family: 2 };
          const isDowngrade = tierOrder[key as keyof typeof tierOrder] < tierOrder[currentTier];
          const hasPaidPlan = plan.price > 0;
          const annualPrice = "annualPrice" in plan ? (plan as typeof planFeatures.pro).annualPrice : 0;
          const displayPrice = hasPaidPlan && isAnnual ? annualPrice : plan.price;
          const displayPeriod = hasPaidPlan && isAnnual ? "year" : plan.period;
          const monthlyEquivalent = hasPaidPlan && isAnnual ? annualPrice / 12 : 0;

          // Check if this is a billing cycle change (same plan, different billing)
          const selectedBilling = isAnnual ? "yearly" : "monthly";
          const isBillingChange = isCurrentPlan && hasPaidPlan && selectedBilling !== currentBillingCycle;
          const canSwitchBilling = isBillingChange && hasActiveSubscription;

          return (
            <Card
              key={key}
              className={cn(
                "flex flex-col",
                isCurrentPlan && "border-primary border-2",
                isPlanPopular && !isCurrentPlan && "border-primary/50"
              )}
            >
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isPlanPopular && !isCurrentPlan && (
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge variant="secondary">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? "Free" : formatCurrency(displayPrice)}
                  </span>
                  {hasPaidPlan && (
                    <span className="text-muted-foreground">/{displayPeriod}</span>
                  )}
                </div>
                {hasPaidPlan && isAnnual && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(monthlyEquivalent)}/month • 2 months free
                  </p>
                )}
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check size={18} className="text-green-500 mt-0.5 shrink-0" weight="bold" />
                      ) : (
                        <X size={18} className="text-muted-foreground/50 mt-0.5 shrink-0" />
                      )}
                      <span className={cn(!feature.included && "text-muted-foreground/70")}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full mt-6",
                    isDowngrade && !isCurrentPlan && "border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950",
                    canSwitchBilling && "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  )}
                  variant={isCurrentPlan && !canSwitchBilling ? "outline" : isPlanPopular && !isDowngrade ? "default" : "outline"}
                  size="lg"
                  disabled={(isCurrentPlan && !canSwitchBilling) || key === "free" || (isUpgrading && selectedPlan === key)}
                  onClick={() => handleSelectPlan(key)}
                >
                  {isUpgrading && selectedPlan === key ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : canSwitchBilling ? (
                    <>
                      <ArrowUp size={18} className="mr-2" />
                      Switch to {isAnnual ? "Yearly" : "Monthly"}
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <CheckCircle size={18} className="mr-2" weight="fill" />
                      Current Plan
                    </>
                  ) : key === "free" ? (
                    "Cancel to downgrade"
                  ) : isDowngrade ? (
                    <>
                      <ArrowDown size={18} className="mr-2" />
                      Downgrade to {plan.name}
                    </>
                  ) : (
                    <>
                      <ArrowUp size={18} className="mr-2" />
                      {currentTier === "free" ? "Get" : "Upgrade to"} {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features Comparison Note */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              All plans include bank-level security, automatic transaction categorization, and basic spending insights.
              <br />
              Need help choosing? <Button variant="link" className="px-1 h-auto">Contact our team</Button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Money-back guarantee */}
      <div className="text-center text-sm text-muted-foreground pb-6">
        <p>7-day money-back guarantee on all paid plans. No questions asked.</p>
      </div>
    </>
  );
}
