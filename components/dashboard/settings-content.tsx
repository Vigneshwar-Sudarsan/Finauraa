"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Bell,
  Shield,
  Bank,
  SignOut,
  CaretRight,
  Moon,
  Sun,
  Globe,
  Trash,
  SpinnerGap,
  Crown,
  Sparkle,
} from "@phosphor-icons/react";

interface SettingItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: "toggle" | "link" | "button";
  value?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: string | null;
  badgeLoading?: boolean;
}

export function SettingsContent() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "pro" | "family" | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Fetch subscription tier
  const fetchSubscriptionTier = useCallback(async () => {
    setIsLoadingSubscription(true);
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionTier(data.subscription?.tier || "free");
      } else {
        setSubscriptionTier("free");
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setSubscriptionTier("free");
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    fetchSubscriptionTier();
  }, [fetchSubscriptionTier]);

  // Use resolvedTheme which handles "system" theme, default to true (dark) before mount
  const isDarkMode = mounted ? resolvedTheme === "dark" : true;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to log out:", error);
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    if (
      !confirm(
        "This will permanently delete all your data including bank connections, transactions, and settings. Continue?"
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      // First disconnect all banks
      await fetch("/api/finance/connections/disconnect-all", {
        method: "POST",
      });

      // Then delete the account (this would need a proper endpoint)
      // For now, just sign out
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeletingAccount(false);
    }
  };

  const handleDisconnectAllBanks = async () => {
    if (!confirm("Are you sure you want to disconnect all banks?")) {
      return;
    }

    try {
      await fetch("/api/finance/connections/disconnect-all", {
        method: "POST",
      });
      // Refresh the page to show updated state
      window.location.reload();
    } catch (error) {
      console.error("Failed to disconnect banks:", error);
    }
  };

  // Get display name for subscription tier
  const getTierDisplayName = (tier: "free" | "pro" | "family" | null) => {
    if (tier === null) return null; // Loading state
    switch (tier) {
      case "pro":
        return "Pro";
      case "family":
        return "Family";
      default:
        return "Free";
    }
  };

  const accountSettings: SettingItem[] = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your personal information",
      action: "link",
      href: "/dashboard/settings/profile",
    },
    {
      icon: Crown,
      title: "Subscription",
      description: "Manage your plan and billing",
      action: "link",
      href: "/dashboard/settings/subscription",
      badge: getTierDisplayName(subscriptionTier),
      badgeLoading: isLoadingSubscription,
    },
    {
      icon: Bank,
      title: "Connected Banks",
      description: "Manage your bank connections",
      action: "link",
      href: "/dashboard/settings/connected-banks",
    },
  ];

  const preferenceSettings: SettingItem[] = [
    {
      icon: Bell,
      title: "Notifications",
      description: "Manage alerts and notification preferences",
      action: "link",
      href: "/dashboard/settings/notifications",
    },
    {
      icon: isDarkMode ? Moon : Sun,
      title: "Dark Mode",
      description: "Switch between light and dark themes",
      action: "toggle",
      value: isDarkMode,
      onClick: () => setTheme(isDarkMode ? "light" : "dark"),
    },
    {
      icon: Globe,
      title: "Language",
      description: "English",
      action: "link",
      href: "#language",
    },
  ];

  const aiSettings: SettingItem[] = [
    {
      icon: Sparkle,
      title: "AI Privacy Settings",
      description: "Choose between Privacy-First or Enhanced AI mode",
      action: "link",
      href: "/dashboard/settings/ai-privacy",
    },
  ];

  const securitySettings: SettingItem[] = [
    {
      icon: Shield,
      title: "Security",
      description: "Password and authentication",
      action: "link",
      href: "#security",
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number, totalItems: number) => {
    const Icon = item.icon;

    // For toggle items, use a div instead of button to avoid nested button issue
    if (item.action === "toggle") {
      return (
        <div key={index}>
          {index > 0 && <Separator />}
          <div
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={item.onClick}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <Switch checked={item.value} onCheckedChange={item.onClick} />
          </div>
        </div>
      );
    }

    return (
      <div key={index}>
        {index > 0 && <Separator />}
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
          onClick={() => {
            if (item.onClick) {
              item.onClick();
            } else if (item.href) {
              if (item.href.startsWith("/")) {
                router.push(item.href);
              }
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} className="text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{item.title}</p>
                {item.badgeLoading ? (
                  <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded animate-pulse w-10 h-4" />
                ) : item.badge ? (
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
          <CaretRight size={16} className="text-muted-foreground" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Settings" />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Account Section */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accountSettings.map((item, index) =>
                renderSettingItem(item, index, accountSettings.length)
              )}
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {preferenceSettings.map((item, index) =>
                renderSettingItem(item, index, preferenceSettings.length)
              )}
            </CardContent>
          </Card>

          {/* AI Settings Section */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">AI Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {aiSettings.map((item, index) =>
                renderSettingItem(item, index, aiSettings.length)
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {securitySettings.map((item, index) =>
                renderSettingItem(item, index, securitySettings.length)
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-0">
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors text-left"
                  onClick={handleDisconnectAllBanks}
                >
                  <div className="flex items-center gap-3">
                    <Bank size={20} className="text-destructive" />
                    <div>
                      <p className="font-medium text-sm text-destructive">Disconnect All Banks</p>
                      <p className="text-xs text-muted-foreground">Remove all bank connections</p>
                    </div>
                  </div>
                  <CaretRight size={16} className="text-destructive" />
                </button>
              </div>
              <Separator />
              <div>
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors text-left"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  <div className="flex items-center gap-3">
                    {isDeletingAccount ? (
                      <SpinnerGap size={20} className="text-destructive animate-spin" />
                    ) : (
                      <Trash size={20} className="text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete all data</p>
                    </div>
                  </div>
                  <CaretRight size={16} className="text-destructive" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Log Out Button */}
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <div className="flex items-center gap-3">
                  {isLoggingOut ? (
                    <SpinnerGap size={20} className="text-muted-foreground animate-spin" />
                  ) : (
                    <SignOut size={20} className="text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">Log Out</p>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
                <CaretRight size={16} className="text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* App Info */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            <p>Finauraa v1.0.0</p>
            <p className="mt-1">Made with love in Bahrain</p>
          </div>
        </div>
      </div>

    </div>
  );
}
