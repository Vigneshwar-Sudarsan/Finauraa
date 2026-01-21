"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
} from "@phosphor-icons/react";

interface SubscriptionData {
  tier: "free" | "pro" | "family";
  status: "active" | "canceled" | "past_due" | "trialing";
  startedAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
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
}

// Plan configuration for display (prices in BHD - Bahraini Dinar)
const planInfo = {
  free: {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out",
  },
  pro: {
    name: "Pro",
    price: 2.99,
    period: "month",
    description: "For singles & couples",
  },
  family: {
    name: "Family",
    price: 5.99,
    period: "month",
    description: "For the whole family",
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: "BHD",
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
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData>({
    tier: "free",
    status: "active",
    startedAt: null,
    endsAt: null,
    trialEndsAt: null,
  });
  const [usage, setUsage] = useState<UsageData>({
    bankConnections: { used: 0, limit: 1 },
    transactions: { used: 0, limit: 500 },
    aiQueries: { used: 0, limit: 5 },
    exports: { used: 0, limit: 0 },
  });
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        // Fetch subscription status
        const subResponse = await fetch("/api/subscription");
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData.subscription);
          // Merge API usage data with defaults to handle missing fields
          setUsage(prev => ({
            bankConnections: subData.usage?.bankConnections ?? prev.bankConnections,
            transactions: subData.usage?.transactions ?? prev.transactions,
            aiQueries: subData.usage?.aiQueries ?? prev.aiQueries,
            exports: subData.usage?.exports ?? prev.exports,
          }));
          setBillingHistory(subData.billingHistory || []);
          setPaymentMethods(subData.paymentMethods || []);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  }, []);

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

  const currentPlan = planInfo[subscription.tier];
  const isFreePlan = subscription.tier === "free";

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
      <div>
        <h1 className="text-xl font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan and billing
        </p>
      </div>

      {/* Current Plan Card */}
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
                      {subscription.status === "trialing" && (
                        <Badge variant="secondary">Trial</Badge>
                      )}
                      {subscription.status === "canceled" && (
                        <Badge variant="destructive">Canceled</Badge>
                      )}
                      {subscription.status === "past_due" && (
                        <Badge variant="destructive">Past Due</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {currentPlan.price === 0 ? "Free" : formatCurrency(currentPlan.price)}
                  </p>
                  {currentPlan.price > 0 && (
                    <p className="text-sm text-muted-foreground">per {currentPlan.period}</p>
                  )}
                </div>
              </div>

              {/* Action buttons and subscription dates */}
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                {!isFreePlan && (
                  <>
                    {subscription.trialEndsAt && subscription.status === "trialing" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={16} />
                        <span>Trial ends {formatDate(subscription.trialEndsAt)}</span>
                      </div>
                    )}
                    {subscription.endsAt && subscription.status === "canceled" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlank size={16} />
                        <span>Access until {formatDate(subscription.endsAt)}</span>
                      </div>
                    )}
                    {subscription.startedAt && subscription.status === "active" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlank size={16} />
                        <span>Member since {formatDate(subscription.startedAt)}</span>
                      </div>
                    )}
                  </>
                )}
                {isFreePlan && <div />}
                <div className="flex items-center gap-2">
                  {!isFreePlan && (
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Manage Subscription
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => router.push("/dashboard/settings/subscription/plans")}
                    className="gap-2"
                  >
                    {isFreePlan ? (
                      <>
                        <Crown size={16} weight="fill" />
                        Upgrade Plan
                      </>
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

          {/* Payment */}
          {!isFreePlan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paymentMethods.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <CreditCard size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No payment method on file</p>
                    <Button variant="link" size="sm" onClick={handleManageSubscription}>
                      Add a payment method
                    </Button>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    {paymentMethods.slice(0, 1).map((method) => (
                      <div key={method.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard size={20} className="text-muted-foreground" />
                          <span className="text-sm capitalize">
                            {method.brand} •••• {method.last4}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                          Update
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Billing History</CardTitle>
              <CardDescription>Your past payments and invoices</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {billingHistory.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Receipt size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No billing history yet</p>
                  {isFreePlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade to a paid plan to see your invoices here
                    </p>
                  )}
                </div>
              ) : (
                <ItemGroup>
                  {billingHistory.map((record, index) => (
                    <div key={record.id}>
                      {index > 0 && <ItemSeparator />}
                      <Item variant="default" size="sm">
                        <ItemMedia variant="icon">
                          <div className={cn(
                            "size-10 rounded-xl flex items-center justify-center",
                            record.status === "succeeded" ? "bg-green-500/10" :
                            record.status === "failed" ? "bg-red-500/10" : "bg-muted"
                          )}>
                            <Receipt
                              size={20}
                              className={cn(
                                record.status === "succeeded" ? "text-green-600" :
                                record.status === "failed" ? "text-red-600" : "text-muted-foreground"
                              )}
                            />
                          </div>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{record.description}</ItemTitle>
                          <ItemDescription>
                            {formatDate(record.createdAt)} •
                            <span className={cn(
                              "ml-1 capitalize",
                              record.status === "succeeded" ? "text-green-600" :
                              record.status === "failed" ? "text-red-600" : ""
                            )}>
                              {record.status}
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">
                              {formatCurrency(record.amount)}
                            </span>
                            {record.invoiceUrl && (
                              <Button variant="ghost" size="icon" className="size-8" asChild>
                                <a href={record.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <DownloadSimple size={16} />
                                </a>
                              </Button>
                            )}
                          </div>
                        </ItemActions>
                      </Item>
                    </div>
                  ))}
                </ItemGroup>
              )}
            </CardContent>
          </Card>

          {/* FAQ Section */}
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
