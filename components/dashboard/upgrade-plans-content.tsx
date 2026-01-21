"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Crown,
  Check,
  X,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Plan features configuration (prices in BHD - Bahraini Dinar)
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
    price: 2.99,
    period: "month",
    description: "For singles & couples",
    popular: true,
    annualPrice: 29.99,
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
    price: 5.99,
    period: "month",
    description: "For the whole family",
    annualPrice: 59.99,
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
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function UpgradePlansContent() {
  const [currentTier, setCurrentTier] = useState<"free" | "pro" | "family">("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription");
        if (response.ok) {
          const data = await response.json();
          setCurrentTier(data.subscription.tier);
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
    if (plan === currentTier) return;

    setIsUpgrading(true);
    setSelectedPlan(plan);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: isAnnual ? "year" : "month" }),
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
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
                  className="w-full mt-6"
                  variant={isCurrentPlan ? "outline" : isPlanPopular ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan || (isUpgrading && selectedPlan === key)}
                  onClick={() => handleSelectPlan(key)}
                >
                  {isUpgrading && selectedPlan === key ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : isDowngrade ? (
                    `Downgrade to ${plan.name}`
                  ) : (
                    `Upgrade to ${plan.name}`
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
