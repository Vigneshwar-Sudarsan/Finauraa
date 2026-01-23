"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import {
  Crown,
  Bank,
  CreditCard,
  Receipt,
  CalendarBlank,
  ArrowRight,
  SpinnerGap,
  DownloadSimple,
  Sparkle,
  Export,
  Headset,
  Clock,
  Infinity,
  CheckCircle,
  Warning,
  ArrowCounterClockwise,
  Users,
  SignOut,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SubscriptionData {
  tier: "free" | "pro" | "family";
  status: "active" | "canceled" | "past_due" | "trialing" | "canceling" | "paused" | "incomplete";
  billingCycle: "monthly" | "yearly";
  startedAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  isFamilyMember?: boolean; // True if user inherits tier from family group owner
}

interface BillingChangePreview {
  currentBilling: string;
  newBilling: string;
  plan: string;
  isUpgradeToYearly: boolean;
  proratedAmount: number;
  totalAmount: number;
  creditAmount: number;
  currency: string;
  nextBillingDate: string | null;
  yearlySavings: number;
  savingsPercentage: number;
}

interface UsageData {
  bankConnections: { used: number; limit: number | null };
  transactions: { used: number; limit: number | null };
  aiQueries: { used: number; limit: number };
  exports: { used: number; limit: number };
}

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  description: string;
  invoiceUrl: string | null;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  type: "card";
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  isSubscriptionPayment: boolean;
}

// Plan configuration for display (prices in USD)
// Note: Family plan has been merged into Pro - existing family subscribers
// are treated as Pro subscribers for display purposes
const planInfo = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Perfect for trying out",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    description: "Everything unlimited + family",
  },
  // Keep family for backwards compatibility with existing subscribers
  family: {
    name: "Pro",  // Display as "Pro" since they have same features
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    description: "Everything unlimited + family",
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData>({
    tier: "free",
    status: "active",
    billingCycle: "monthly",
    startedAt: null,
    endsAt: null,
    trialEndsAt: null,
    isFamilyMember: false,
  });
  const [billingChangePreview, setBillingChangePreview] = useState<BillingChangePreview | null>(null);
  const [isLoadingBillingPreview, setIsLoadingBillingPreview] = useState(false);
  const [isBillingChangeLoading, setIsBillingChangeLoading] = useState(false);
  const [isBillingCycleUpdating, setIsBillingCycleUpdating] = useState(false);
  const [showBillingChangeDialog, setShowBillingChangeDialog] = useState(false);
  const [usage, setUsage] = useState<UsageData>({
    bankConnections: { used: 0, limit: 1 },
    transactions: { used: 0, limit: 500 },
    aiQueries: { used: 0, limit: 5 },
    exports: { used: 0, limit: 0 },
  });
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [familyGroupInfo, setFamilyGroupInfo] = useState<{
    name: string;
    ownerName: string;
  } | null>(null);

  // Check for success param from Stripe checkout redirect
  const isCheckoutSuccess = searchParams.get("success") === "true";

  const fetchSubscriptionData = async () => {
    try {
      const subResponse = await fetch("/api/subscription");
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
        setUsage(prev => ({
          bankConnections: subData.usage?.bankConnections ?? prev.bankConnections,
          transactions: subData.usage?.transactions ?? prev.transactions,
          aiQueries: subData.usage?.aiQueries ?? prev.aiQueries,
          exports: subData.usage?.exports ?? prev.exports,
        }));
        setBillingHistory(subData.billingHistory || []);
        setPaymentMethods(subData.paymentMethods || []);

        // If user is a family member, fetch family group info
        if (subData.subscription?.isFamilyMember) {
          try {
            const familyResponse = await fetch("/api/family/group");
            if (familyResponse.ok) {
              const familyData = await familyResponse.json();
              setFamilyGroupInfo({
                name: familyData.group?.name || "Family Group",
                ownerName: familyData.group?.owner?.full_name || familyData.group?.owner?.email || "Group Owner",
              });
            }
          } catch (familyError) {
            console.error("Failed to fetch family group info:", familyError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync subscription from Stripe (useful after checkout when webhook might be delayed)
  const syncSubscription = async () => {
    setIsSyncing(true);
    try {
      const syncResponse = await fetch("/api/subscription/sync", { method: "POST" });
      if (syncResponse.ok) {
        // Re-fetch subscription data after sync
        await fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // If coming from checkout, sync first then fetch
    if (isCheckoutSuccess) {
      router.replace("/dashboard/settings/subscription", { scroll: false });

      // Sync subscription from Stripe to ensure database is updated
      const performSync = async () => {
        await syncSubscription();
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      };
      performSync();
    } else {
      fetchSubscriptionData();
    }
  }, [isCheckoutSuccess, router]);

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });

      if (response.ok) {
        const { portalUrl } = await response.json();
        window.location.href = portalUrl;
      }
    } catch (error) {
      console.error("Failed to open portal:", error);
    }
  };

  const handleCancelSubscription = async () => {
    setIsActionLoading(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediate: false }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        await fetchSubscriptionData();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setIsActionLoading(false);
          }
  };

  const handleReactivateSubscription = async () => {
    setIsActionLoading(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        await fetchSubscriptionData();
      } else {
        toast.error(data.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      toast.error("Failed to reactivate subscription");
    } finally {
      setIsActionLoading(false);
          }
  };

  const fetchBillingChangePreview = async (newBilling: "monthly" | "yearly") => {
    setIsLoadingBillingPreview(true);
    try {
      const response = await fetch(`/api/subscription/change-billing?billing=${newBilling}`);
      const data = await response.json();

      if (response.ok) {
        setBillingChangePreview(data.preview);
        setShowBillingChangeDialog(true);
      } else {
        toast.error(data.error || "Failed to get billing preview");
      }
    } catch (error) {
      console.error("Failed to fetch billing preview:", error);
      toast.error("Failed to get billing preview");
    } finally {
      setIsLoadingBillingPreview(false);
    }
  };

  const handleBillingCycleChange = async () => {
    if (!billingChangePreview) return;

    setIsBillingChangeLoading(true);
    try {
      const response = await fetch("/api/subscription/change-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: billingChangePreview.newBilling }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowBillingChangeDialog(false);
        setBillingChangePreview(null);
        setIsBillingChangeLoading(false);
        // Show loading in the billing cycle card while fetching updated data
        setIsBillingCycleUpdating(true);
        await fetchSubscriptionData();
        setIsBillingCycleUpdating(false);
      } else {
        toast.error(data.error || "Failed to change billing cycle");
        setIsBillingChangeLoading(false);
      }
    } catch (error) {
      console.error("Failed to change billing cycle:", error);
      toast.error("Failed to change billing cycle");
      setIsBillingChangeLoading(false);
    } finally {
          }
  };

  const currentPlan = planInfo[subscription.tier];
  const isFreePlan = subscription.tier === "free";
  const isCanceling = subscription.status === "canceling";
  const isPastDue = subscription.status === "past_due";
  const isPaused = subscription.status === "paused";
  const isTrialing = subscription.status === "trialing";
  const isIncomplete = subscription.status === "incomplete";
  const isYearly = subscription.billingCycle === "yearly";
  const isFamilyMember = subscription.isFamilyMember === true;
  const currentPrice = isFreePlan
    ? 0
    : isYearly
    ? currentPlan.yearlyPrice
    : currentPlan.monthlyPrice;

  if (isLoading || isSyncing) {
    return (
      <>
        {/* Page Title Skeleton */}
        <div>
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Current Plan Card Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats Card Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Billing History Card Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28 mb-1" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Syncing message */}
        {isSyncing && (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SpinnerGap size={16} className="animate-spin" />
              <span className="text-sm">Updating your subscription...</span>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Please wait while we confirm your payment and activate your new plan.
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Success Message */}
      {showSuccessMessage && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600" weight="fill" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Subscription Updated Successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your plan has been upgraded. Enjoy your new features!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {isPastDue && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Warning size={24} className="text-red-600" weight="fill" />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Payment Past Due
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Your last payment failed. Please update your payment method to continue using premium features.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleManageSubscription}>
                Update Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Scheduled Warning */}
      {isCanceling && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Warning size={24} className="text-yellow-600" weight="fill" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Cancellation Scheduled
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your subscription will be canceled on {subscription.endsAt ? formatDate(subscription.endsAt) : "the end of your billing period"}. You&apos;ll continue to have access until then.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivateSubscription}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <>
                    <ArrowCounterClockwise size={16} className="mr-1" />
                    Keep Subscription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Subscription Warning */}
      {isIncomplete && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Warning size={24} className="text-yellow-600" weight="fill" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Payment Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your subscription requires payment confirmation. Please complete the payment to activate your plan.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                Complete Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          {isFamilyMember ? "Your family membership" : "Manage your plan and billing"}
        </p>
      </div>

      {/* Family Member Info Card - Show for users who are part of a family group but don't own the subscription */}
      {isFamilyMember && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users size={24} className="text-primary" weight="fill" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">Family Member</p>
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You&apos;re part of {familyGroupInfo?.name || "a family group"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium text-primary">Pro Features</p>
                <p className="text-sm text-muted-foreground">Included with membership</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <p>Managed by {familyGroupInfo?.ownerName || "the group owner"}</p>
                <p className="text-xs mt-1">Contact the group owner for billing questions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/settings/family")}
                className="gap-2"
              >
                <Users size={16} />
                View Family
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Card - Only show for non-family members */}
      {!isFamilyMember && (
          <Card className={cn(
            "relative overflow-hidden",
            !isFreePlan && "border-primary/50"
          )}>
            {!isFreePlan && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                Current Plan
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-12 rounded-full flex items-center justify-center",
                    isFreePlan ? "bg-muted" : "bg-primary/10"
                  )}>
                    <Crown size={24} className={isFreePlan ? "text-muted-foreground" : "text-primary"} weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{currentPlan.name}</p>
                      {isTrialing && (
                        <Badge variant="secondary">Trial</Badge>
                      )}
                      {subscription.status === "canceled" && (
                        <Badge variant="destructive">Canceled</Badge>
                      )}
                      {isPastDue && (
                        <Badge variant="destructive">Past Due</Badge>
                      )}
                      {isCanceling && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">Canceling</Badge>
                      )}
                      {isPaused && (
                        <Badge variant="outline">Paused</Badge>
                      )}
                      {isIncomplete && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">Incomplete</Badge>
                      )}
                      {subscription.status === "active" && !isFreePlan && (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {currentPrice === 0 ? "Free" : formatCurrency(currentPrice)}
                  </p>
                  {currentPrice > 0 && (
                    <p className="text-sm text-muted-foreground">
                      per {isYearly ? "year" : "month"}
                    </p>
                  )}
                  {isYearly && !isFreePlan && (
                    <Badge variant="secondary" className="mt-1 bg-green-500/10 text-green-600 border-green-500/20">
                      Save 17%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action buttons and subscription dates */}
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                {!isFreePlan && (
                  <>
                    {subscription.trialEndsAt && isTrialing && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={16} />
                        <span>Trial ends {formatDate(subscription.trialEndsAt)}</span>
                      </div>
                    )}
                    {subscription.endsAt && (subscription.status === "canceled" || isCanceling) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlank size={16} />
                        <span>{isCanceling ? "Cancels" : "Access until"} {formatDate(subscription.endsAt)}</span>
                      </div>
                    )}
                    {subscription.startedAt && subscription.status === "active" && !isCanceling && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlank size={16} />
                        <span>Member since {formatDate(subscription.startedAt)}</span>
                      </div>
                    )}
                    {subscription.endsAt && subscription.status === "active" && !isCanceling && (
                      <div className="flex items-center gap-2 text-muted-foreground ml-4">
                        <Clock size={16} />
                        <span>Renews {formatDate(subscription.endsAt)}</span>
                      </div>
                    )}
                  </>
                )}
                {isFreePlan && <div />}
                <div className="flex items-center gap-2">
                  {!isFreePlan && subscription.status !== "canceled" && (
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Manage Billing
                    </Button>
                  )}
                  {!isFreePlan && subscription.status === "active" && !isCanceling && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          Cancel Plan
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will be canceled at the end of your current billing period on{" "}
                            {subscription.endsAt ? formatDate(subscription.endsAt) : "your next billing date"}.
                            You&apos;ll continue to have access to all {currentPlan.name} features until then.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isActionLoading ? (
                              <SpinnerGap size={16} className="animate-spin" />
                            ) : (
                              "Cancel Subscription"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    size="sm"
                    onClick={() => router.push("/dashboard/settings/subscription/plans")}
                    className="gap-2"
                    disabled={subscription.status === "canceled"}
                  >
                    {isFreePlan ? (
                      <>
                        <Crown size={16} weight="fill" />
                        Upgrade Plan
                      </>
                    ) : subscription.status === "canceled" ? (
                      "Resubscribe"
                    ) : (
                      <>
                        Change Plan
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      )}

          {/* Billing Cycle Card - Only show for paid plans and non-family members */}
          {!isFamilyMember && !isFreePlan && subscription.status === "active" && !isCanceling && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Billing Cycle</CardTitle>
                <CardDescription>Switch between monthly and yearly billing</CardDescription>
              </CardHeader>
              <CardContent>
                {isBillingCycleUpdating ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <SpinnerGap size={24} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Updating your billing cycle...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                          <CalendarBlank size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {isYearly ? "Yearly" : "Monthly"} billing
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isYearly ? (
                              <>You&apos;re saving 17% with annual billing</>
                            ) : (
                              <>Switch to yearly and save 17%</>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBillingChangePreview(isYearly ? "monthly" : "yearly")}
                        disabled={isLoadingBillingPreview}
                      >
                        {isLoadingBillingPreview ? (
                          <SpinnerGap size={16} className="animate-spin" />
                        ) : (
                          <>Switch to {isYearly ? "Monthly" : "Yearly"}</>
                        )}
                      </Button>
                    </div>

                    {/* Yearly savings info */}
                    {!isYearly && (
                      <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-start gap-2">
                          <Sparkle size={18} className="text-green-600 shrink-0 mt-0.5" weight="fill" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              Save {formatCurrency((currentPlan.monthlyPrice * 12) - currentPlan.yearlyPrice)} per year
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Pay {formatCurrency(currentPlan.yearlyPrice)}/year instead of {formatCurrency(currentPlan.monthlyPrice * 12)}/year
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing Cycle Change Confirmation Dialog */}
          <Dialog open={showBillingChangeDialog} onOpenChange={setShowBillingChangeDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {billingChangePreview?.isUpgradeToYearly
                    ? "Switch to Yearly Billing"
                    : "Switch to Monthly Billing"}
                </DialogTitle>
                <DialogDescription>
                  {billingChangePreview?.isUpgradeToYearly
                    ? "You're about to switch to yearly billing and save 17%!"
                    : "You're about to switch to monthly billing."}
                </DialogDescription>
              </DialogHeader>

              {billingChangePreview && (
                <div className="space-y-4 py-4">
                  {/* Price comparison */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      {billingChangePreview.isUpgradeToYearly ? (
                        <>
                          <p className="text-sm text-muted-foreground">Amount due today</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(billingChangePreview.proratedAmount)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Account credit</p>
                          <p className="text-xl font-bold text-green-600">
                            +{formatCurrency(billingChangePreview.creditAmount)}
                          </p>
                        </>
                      )}
                    </div>
                    {billingChangePreview.isUpgradeToYearly && billingChangePreview.yearlySavings > 0 && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        Save {formatCurrency(billingChangePreview.yearlySavings)}/year
                      </Badge>
                    )}
                    {!billingChangePreview.isUpgradeToYearly && billingChangePreview.creditAmount > 0 && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                        Credit applied
                      </Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current billing</span>
                      <span className="capitalize">{billingChangePreview.currentBilling}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New billing</span>
                      <span className="capitalize">{billingChangePreview.newBilling}</span>
                    </div>
                    {!billingChangePreview.isUpgradeToYearly && billingChangePreview.creditAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit covers approx.</span>
                        <span>
                          {Math.floor(billingChangePreview.creditAmount / currentPlan.monthlyPrice)} months
                        </span>
                      </div>
                    )}
                    {billingChangePreview.nextBillingDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next billing date</span>
                        <span>{formatDate(billingChangePreview.nextBillingDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Info note */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {billingChangePreview.isUpgradeToYearly ? (
                      <p>A prorated amount will be charged to your payment method for the difference.</p>
                    ) : (
                      <>
                        <p>
                          <strong>Credit applied:</strong> The unused portion of your yearly subscription will be credited to your account.
                        </p>
                        <p>
                          This credit will automatically offset your future monthly charges until it&apos;s used up. No cash refund is issued.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBillingChangeDialog(false);
                    setBillingChangePreview(null);
                  }}
                  disabled={isBillingChangeLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBillingCycleChange}
                  disabled={isBillingChangeLoading}
                >
                  {isBillingChangeLoading ? (
                    <SpinnerGap size={16} className="animate-spin mr-2" />
                  ) : null}
                  Confirm Change
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Usage Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Usage This Month</CardTitle>
              <CardDescription>Track your feature usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bank Connections */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Bank size={16} className="text-muted-foreground" />
                    <span className="text-sm">Bank Connections</span>
                  </div>
                  <span className="text-sm font-medium">
                    {usage.bankConnections.used} / {usage.bankConnections.limit === null ? <Infinity size={14} className="inline" /> : usage.bankConnections.limit}
                  </span>
                </div>
                <Progress
                  value={usage.bankConnections.limit ? (usage.bankConnections.used / usage.bankConnections.limit) * 100 : 0}
                  className="h-2"
                />
              </div>

              {/* AI Queries */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sparkle size={16} className="text-muted-foreground" />
                    <span className="text-sm">AI Queries</span>
                  </div>
                  <span className="text-sm font-medium">
                    {usage.aiQueries.used} / {usage.aiQueries.limit === -1 ? <Infinity size={14} className="inline" /> : usage.aiQueries.limit}
                  </span>
                </div>
                <Progress
                  value={usage.aiQueries.limit === -1 ? 0 : (usage.aiQueries.used / usage.aiQueries.limit) * 100}
                  className="h-2"
                />
              </div>

              {/* Data Exports */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Export size={16} className="text-muted-foreground" />
                    <span className="text-sm">Data Exports</span>
                  </div>
                  <span className="text-sm font-medium">
                    {usage.exports?.used ?? 0} / {usage.exports?.limit === -1 ? <Infinity size={14} className="inline" /> : (usage.exports?.limit ?? 0)}
                  </span>
                </div>
                <Progress
                  value={!usage.exports?.limit || usage.exports.limit === -1 || usage.exports.limit === 0 ? 0 : (usage.exports.used / usage.exports.limit) * 100}
                  className="h-2"
                />
                {(usage.exports?.limit === 0 || !usage.exports) && isFreePlan && (
                  <p className="text-xs text-muted-foreground mt-1">Upgrade to Pro for data exports</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method - Hide for family members */}
          {!isFreePlan && !isFamilyMember && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment Method</CardTitle>
                <CardDescription>Card used for your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <CreditCard size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">No payment method on file</p>
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Show the subscription payment method first, or the default one */}
                    {(() => {
                      const subscriptionCard = paymentMethods.find(m => m.isSubscriptionPayment) ||
                                              paymentMethods.find(m => m.isDefault) ||
                                              paymentMethods[0];
                      if (!subscriptionCard) return null;

                      return (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/50 bg-primary/5">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-background border flex items-center justify-center">
                              <CreditCard size={24} className="text-primary" weight="fill" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {subscriptionCard.brand}
                                </span>
                                <span className="text-muted-foreground">
                                  ending in {subscriptionCard.last4}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm text-muted-foreground">
                                  Expires {subscriptionCard.expMonth.toString().padStart(2, '0')}/{subscriptionCard.expYear.toString().slice(-2)}
                                </p>
                                {subscriptionCard.isSubscriptionPayment && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                    Active for billing
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                            Update Card
                          </Button>
                        </div>
                      );
                    })()}

                    {/* Show other payment methods if there are more */}
                    {paymentMethods.length > 1 && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-xs text-muted-foreground mb-2">Other cards on file</p>
                        {paymentMethods
                          .filter(m => !m.isSubscriptionPayment && !m.isDefault)
                          .slice(0, 2)
                          .map((method) => (
                            <div
                              key={method.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <CreditCard size={18} className="text-muted-foreground" />
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="capitalize">{method.brand}</span>
                                  <span className="text-muted-foreground">•••• {method.last4}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {method.expMonth.toString().padStart(2, '0')}/{method.expYear.toString().slice(-2)}
                              </span>
                            </div>
                          ))
                        }
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={handleManageSubscription}
                    >
                      Manage All Payment Methods
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing History - Hide for family members */}
          {!isFamilyMember && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Billing History</CardTitle>
                  <CardDescription>Your past payments and invoices</CardDescription>
                </div>
                {billingHistory.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {billingHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Receipt size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No billing history yet</p>
                  {isFreePlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade to a paid plan to see your invoices here
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {billingHistory.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "size-10 rounded-lg flex items-center justify-center",
                          record.status === "succeeded" ? "bg-green-500/10" :
                          record.status === "failed" ? "bg-red-500/10" :
                          record.status === "refunded" ? "bg-blue-500/10" : "bg-muted"
                        )}>
                          <Receipt
                            size={20}
                            className={cn(
                              record.status === "succeeded" ? "text-green-600" :
                              record.status === "failed" ? "text-red-600" :
                              record.status === "refunded" ? "text-blue-600" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{record.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(record.createdAt)}</span>
                            <span>•</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs capitalize px-1.5 py-0",
                                record.status === "succeeded" && "bg-green-500/10 text-green-600",
                                record.status === "failed" && "bg-red-500/10 text-red-600",
                                record.status === "refunded" && "bg-blue-500/10 text-blue-600",
                                record.status === "pending" && "bg-yellow-500/10 text-yellow-600"
                              )}
                            >
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-semibold tabular-nums",
                          record.status === "refunded" && "text-blue-600"
                        )}>
                          {record.status === "refunded" ? "-" : ""}{formatCurrency(record.amount)}
                        </span>
                        {record.invoiceUrl && (
                          <Button variant="ghost" size="icon" className="size-8" asChild>
                            <a
                              href={record.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download Invoice"
                            >
                              <DownloadSimple size={16} />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* FAQ Section - Show different content for family members */}
          {isFamilyMember ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Family Membership FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-sm">What features do I have access to?</p>
                  <p className="text-sm text-muted-foreground">
                    As a family member, you have full access to all Pro features including unlimited bank connections, AI queries, and data exports.
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium text-sm">Who manages the billing?</p>
                  <p className="text-sm text-muted-foreground">
                    Billing is managed by {familyGroupInfo?.ownerName || "the group owner"}. Contact them for any billing-related questions.
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium text-sm">Can I leave the family group?</p>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can leave the family group at any time from the Family settings page. Your account will revert to the Free plan.
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium text-sm">What happens to my data if I leave?</p>
                  <p className="text-sm text-muted-foreground">
                    Your data is always yours. If you exceed Free tier limits after leaving, you can still view your data but may need to upgrade to add new connections.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium text-sm">Can I cancel anytime?</p>
                <p className="text-sm text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
                </p>
              </div>
              <Separator />
              <div>
                <p className="font-medium text-sm">What payment methods do you accept?</p>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through our secure payment processor.
                </p>
              </div>
              <Separator />
              <div>
                <p className="font-medium text-sm">What happens to my data if I downgrade?</p>
                <p className="text-sm text-muted-foreground">
                  Your data is always safe. If you exceed the limits of a lower tier, you&apos;ll still be able to view your data but may not be able to add new connections until you upgrade or remove some.
                </p>
              </div>
              <Separator />
              <div>
                <p className="font-medium text-sm">Do you offer refunds?</p>
                <p className="text-sm text-muted-foreground">
                  We offer a 7-day money-back guarantee on all paid plans. If you&apos;re not satisfied, contact our support team for a full refund.
                </p>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Support CTA */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Headset size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Need help?</p>
                  <p className="text-sm text-muted-foreground">
                    Our support team is here to help with any billing questions.
                  </p>
                </div>
                <Button variant="outline">Contact Support</Button>
              </div>
            </CardContent>
          </Card>
    </>
  );
}
