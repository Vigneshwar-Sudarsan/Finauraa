"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FeatureBadge } from "@/components/ui/tier-badge";
import {
  Bell,
  EnvelopeSimple,
  DeviceMobile,
  ChartLine,
  Wallet,
  Warning,
  TrendUp,
  Target,
  CalendarCheck,
  Info,
} from "@phosphor-icons/react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { NOTIFICATION_FEATURES, TierLimits } from "@/lib/features";

interface NotificationPreference {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string; weight?: "regular" | "duotone" | "fill" }>;
  title: string;
  description: string;
  enabled: boolean;
  category: "delivery" | "financial" | "insights";
  requiredFeature?: keyof TierLimits; // Feature required for this notification
}

export function NotificationSettings() {
  const router = useRouter();
  const { canAccess, tier, isLoading: featureLoading } = useFeatureAccess();

  // In production, these would be fetched from and saved to the database
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    // Delivery Methods
    {
      id: "email",
      icon: EnvelopeSimple,
      title: "Email Notifications",
      description: "Receive important updates and alerts via email",
      enabled: true,
      category: "delivery",
    },
    {
      id: "push",
      icon: DeviceMobile,
      title: "Push Notifications",
      description: "Get instant alerts on your device",
      enabled: true,
      category: "delivery",
    },
    // Financial Alerts
    {
      id: "spending_alerts",
      icon: Warning,
      title: "Spending Alerts",
      description: "Get notified when you exceed budget limits",
      enabled: true,
      category: "financial",
    },
    {
      id: "large_transactions",
      icon: Wallet,
      title: "Large Transactions",
      description: "Alert when transactions exceed BHD 100",
      enabled: true,
      category: "financial",
    },
    {
      id: "low_balance",
      icon: TrendUp,
      title: "Low Balance Warning",
      description: "Notify when account balance falls below BHD 50",
      enabled: false,
      category: "financial",
    },
    {
      id: "bill_reminders",
      icon: CalendarCheck,
      title: "Bill Reminders",
      description: "Remind about upcoming recurring payments",
      enabled: true,
      category: "financial",
      requiredFeature: "billReminders",
    },
    // Insights & Reports
    {
      id: "weekly_digest",
      icon: ChartLine,
      title: "Weekly Digest",
      description: "Receive a weekly summary of your finances every Sunday",
      enabled: true,
      category: "insights",
    },
    {
      id: "monthly_report",
      icon: ChartLine,
      title: "Monthly Report",
      description: "Detailed monthly spending analysis on the 1st",
      enabled: true,
      category: "insights",
    },
    {
      id: "goal_progress",
      icon: Target,
      title: "Goal Progress Updates",
      description: "Updates when you make progress on savings goals",
      enabled: true,
      category: "insights",
      requiredFeature: "goalProgressAlerts",
    },
    {
      id: "ai_insights",
      icon: ChartLine,
      title: "AI Insights",
      description: "Personalized financial tips based on your spending",
      enabled: false,
      category: "insights",
      requiredFeature: "aiInsightsNotifications",
    },
  ]);

  const togglePreference = (id: string) => {
    const pref = preferences.find(p => p.id === id);

    // Check if feature requires upgrade
    if (pref?.requiredFeature && !canAccess(pref.requiredFeature)) {
      // Don't toggle, redirect to upgrade page
      router.push("/dashboard/settings/subscription/plans");
      return;
    }

    setPreferences(prev =>
      prev.map(p =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      )
    );
    // In production, save to database here
  };

  const deliveryPrefs = preferences.filter(p => p.category === "delivery");
  const financialPrefs = preferences.filter(p => p.category === "financial");
  const insightPrefs = preferences.filter(p => p.category === "insights");

  const renderPreference = (pref: NotificationPreference, index: number, total: number) => {
    const Icon = pref.icon;
    const isLocked = pref.requiredFeature && !canAccess(pref.requiredFeature);

    return (
      <div key={pref.id}>
        {index > 0 && <Separator />}
        <div className={`flex items-center justify-between py-4 ${isLocked ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-3">
            <Icon size={20} className="text-muted-foreground" weight="duotone" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{pref.title}</p>
                {pref.requiredFeature && (
                  <FeatureBadge showIcon size="sm" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{pref.description}</p>
              {isLocked && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => router.push("/dashboard/settings/subscription/plans")}
                >
                  Upgrade to enable
                </Button>
              )}
            </div>
          </div>
          <Switch
            checked={isLocked ? false : pref.enabled}
            onCheckedChange={() => togglePreference(pref.id)}
            disabled={isLocked}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={20} weight="duotone" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Choose how and when you want to receive notifications about your finances
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Delivery Methods</CardTitle>
          <CardDescription className="text-xs">
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {deliveryPrefs.map((pref, idx) => renderPreference(pref, idx, deliveryPrefs.length))}
        </CardContent>
      </Card>

      {/* Financial Alerts */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Financial Alerts</CardTitle>
          <CardDescription className="text-xs">
            Stay informed about important account activity
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {financialPrefs.map((pref, idx) => renderPreference(pref, idx, financialPrefs.length))}
        </CardContent>
      </Card>

      {/* Insights & Reports */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Insights & Reports</CardTitle>
          <CardDescription className="text-xs">
            Regular updates and analysis of your spending
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {insightPrefs.map((pref, idx) => renderPreference(pref, idx, insightPrefs.length))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" weight="duotone" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Notifications</p>
              <ul className="space-y-1 text-xs">
                <li>Push notifications require browser permission</li>
                <li>Email notifications are sent to your registered email</li>
                <li>You can unsubscribe from emails anytime via the link in the email</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
