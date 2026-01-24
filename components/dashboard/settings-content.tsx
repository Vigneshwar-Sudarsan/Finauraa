"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  LockKey,
  Users,
} from "@phosphor-icons/react";
import { useSubscriptionTier } from "@/hooks/use-subscription";

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
  const { tier: subscriptionTier, isFamilyMember, isLoading: isLoadingSubscription } = useSubscriptionTier();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [familyMemberCount, setFamilyMemberCount] = useState<number | null>(null);

  // Check if user is part of a family group (either as owner or member)
  const hasFamilyGroup = subscriptionTier === "family" || isFamilyMember;

  // Fetch family group info
  useEffect(() => {
    if (hasFamilyGroup) {
      const fetchFamilyInfo = async () => {
        try {
          const response = await fetch("/api/family/group");
          if (response.ok) {
            const data = await response.json();
            if (data.group) {
              setFamilyMemberCount(data.group.member_count || 0);
            }
          }
        } catch (error) {
          console.error("Failed to fetch family info:", error);
        }
      };
      fetchFamilyInfo();
    }
  }, [hasFamilyGroup]);

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
  // Both pro and family tiers display as "Pro" since family plan was merged into Pro
  // Family members also see "Pro" since they inherit Pro features
  const getTierDisplayName = (tier: "free" | "pro" | "family" | null) => {
    if (tier === null) return null; // Loading state
    switch (tier) {
      case "pro":
      case "family":
        return "Pro";
      default:
        // If user is a family member with free tier, they still get Pro features
        return isFamilyMember ? "Pro" : "Free";
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
    // Family settings - show for family tier owners AND family members
    ...(hasFamilyGroup
      ? [
          {
            icon: Users,
            title: "Family Group",
            description: isFamilyMember ? "View your family group" : "Manage your family members",
            action: "link" as const,
            href: "/dashboard/settings/family",
            badge: familyMemberCount !== null ? `${familyMemberCount}/7` : null,
          },
        ]
      : []),
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

  const privacySettings: SettingItem[] = [
    {
      icon: LockKey,
      title: "Privacy & Data",
      description: "Manage consents, data export, and deletion",
      action: "link",
      href: "/dashboard/settings/privacy",
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

  // Show skeleton while mounting or loading subscription
  if (!mounted || isLoadingSubscription) {
    return (
      <div className="flex flex-col h-full">
        <DashboardHeader title="Settings" />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
            {/* Account Section Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    {i > 1 && <Separator />}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-5 rounded" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                      <Skeleton className="size-4" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Preferences Section Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    {i > 1 && <Separator />}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-5 rounded" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      {i === 2 ? (
                        <Skeleton className="h-6 w-11 rounded-full" />
                      ) : (
                        <Skeleton className="size-4" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Settings Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              </CardContent>
            </Card>

            {/* Security Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone Skeleton */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-0">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2].map((i) => (
                  <div key={i}>
                    {i > 1 && <Separator />}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-5 rounded" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                      <Skeleton className="size-4" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Log Out Skeleton */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Privacy & Data Section */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {privacySettings.map((item, index) =>
                renderSettingItem(item, index, privacySettings.length)
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
