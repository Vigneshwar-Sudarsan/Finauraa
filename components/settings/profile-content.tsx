"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TierBadge, FeatureBadge } from "@/components/ui/tier-badge";
import { useProfile } from "@/hooks/use-profile";
import {
  User,
  Envelope,
  Calendar,
  Crown,
  Bank,
  CurrencyCircleDollar,
  ChartLine,
  Shield,
  Download,
  SpinnerGap,
  Check,
  Camera,
  PencilSimple,
  X,
  Export,
  Clock,
  Wallet,
  Target,
} from "@phosphor-icons/react";

export function ProfileContent() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use SWR hook for cached data
  const { profile, stats, userId, userEmail, isLoading, mutate } = useProfile();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Edit mode states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Sync editedName with profile
  useEffect(() => {
    if (profile?.full_name) {
      setEditedName(profile.full_name);
    }
  }, [profile?.full_name]);

  const handleSaveName = async () => {
    if (!editedName.trim() || !userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editedName.trim(), updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      // Revalidate the cache
      mutate();
      setIsEditingName(false);
    } catch (error) {
      console.error("Error saving name:", error);
      alert("Failed to save name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Revalidate the cache
      mutate();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleExportData = async () => {
    if (!profile || profile.subscription_tier === "free" || !userId) {
      alert("Data export is a Pro feature. Upgrade to Pro for $7.99/month to export your financial data.");
      return;
    }

    setExporting(true);
    try {
      // Fetch all user data
      const [
        { data: transactions },
        { data: accounts },
        { data: budgets },
        { data: connections },
      ] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", userId),
        supabase.from("bank_accounts").select("*").eq("user_id", userId),
        supabase.from("budgets").select("*").eq("user_id", userId),
        supabase.from("bank_connections").select("id, bank_name, status, created_at").eq("user_id", userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: {
          name: profile.full_name,
          email: profile.email,
          memberSince: profile.created_at,
          subscriptionTier: profile.subscription_tier,
        },
        bankConnections: connections,
        accounts: accounts?.map(a => ({
          accountNumber: a.account_number,
          accountType: a.account_type,
          balance: a.balance,
          currency: a.currency,
        })),
        transactions: transactions?.map(t => ({
          date: t.transaction_date,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          merchant: t.merchant_name,
          description: t.description,
          type: t.transaction_type,
        })),
        budgets: budgets,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finauraa-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getMembershipDuration = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const months = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (months < 1) return "Less than a month";
    if (months === 1) return "1 month";
    if (months < 12) return `${months} months`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 1 && remainingMonths === 0) return "1 year";
    if (years === 1) return `1 year, ${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} years`;
    return `${years} years, ${remainingMonths} months`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Profile Header Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              <div className="h-5 bg-muted animate-pulse rounded w-36" />
            </div>
            <div className="h-4 bg-muted animate-pulse rounded w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="h-24 w-24 bg-muted animate-pulse rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              <div className="h-5 bg-muted animate-pulse rounded w-36" />
            </div>
            <div className="h-4 bg-muted animate-pulse rounded w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              <div className="h-5 bg-muted animate-pulse rounded w-28" />
            </div>
            <div className="h-4 bg-muted animate-pulse rounded w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile || !userId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Failed to load profile. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} weight="duotone" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your personal details and account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "User"} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name and Email */}
            <div className="flex-1 space-y-3">
              {/* Name Field */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Enter your name"
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={saving || !editedName.trim()}
                    >
                      {saving ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(profile.full_name || "");
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{profile.full_name || "Not set"}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setIsEditingName(true)}
                    >
                      <PencilSimple size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email Address</Label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Envelope size={16} />
                  <p>{userEmail || profile.email || "Not set"}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Status Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Subscription */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Plan</Label>
              <div className="flex items-center gap-2">
                <TierBadge tier={profile.subscription_tier || "free"} showIcon size="md" />
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</Label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span>{formatDate(profile.created_at)}</span>
              </div>
            </div>

            {/* Membership Duration */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Membership</Label>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                <span>{getMembershipDuration(profile.created_at)}</span>
              </div>
            </div>

            {/* Connected Banks */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Connected Banks</Label>
              <div className="flex items-center gap-2 text-sm">
                <Bank size={16} className="text-muted-foreground" />
                <span>{stats?.connectedBanks || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLine size={20} weight="duotone" />
            Financial Overview
          </CardTitle>
          <CardDescription>
            A summary of your financial activity in Finauraa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet size={16} />
                <span className="text-xs uppercase tracking-wide">Accounts</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalAccounts || 0}</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CurrencyCircleDollar size={16} />
                <span className="text-xs uppercase tracking-wide">Transactions</span>
              </div>
              <p className="text-2xl font-bold">{stats?.transactionCount?.toLocaleString() || 0}</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target size={16} />
                <span className="text-xs uppercase tracking-wide">Budgets</span>
              </div>
              <p className="text-2xl font-bold">{stats?.budgetCount || 0}</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar size={16} />
                <span className="text-xs uppercase tracking-wide">History From</span>
              </div>
              <p className="text-sm font-semibold">
                {stats?.oldestTransaction
                  ? new Date(stats.oldestTransaction).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "No data"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} weight="duotone" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Export size={20} className="text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">Export Your Data</p>
                  {profile.subscription_tier === "free" && (
                    <FeatureBadge showIcon size="sm" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Download all your financial data as JSON</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : exportSuccess ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Download size={16} />
              )}
              {exportSuccess ? "Downloaded" : "Export"}
            </Button>
          </div>

          <Separator />

          {/* Data Retention Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" weight="duotone" />
              <div className="text-sm">
                <p className="font-medium mb-1">Your data is protected</p>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>All data is encrypted at rest and in transit</li>
                  <li>Bank credentials are never stored - only access tokens</li>
                  <li>You can delete your account anytime from Settings</li>
                  <li>Compliant with Bahrain PDPL regulations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA for Free Users */}
      {profile.subscription_tier === "free" && (
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Crown size={24} className="text-primary" weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Upgrade to Pro</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock unlimited bank connections, AI queries, data export, and more for just $7.99/month.
                </p>
              </div>
              <Button className="gap-2 whitespace-nowrap" onClick={() => window.location.href = "/dashboard/settings/subscription/plans"}>
                <Crown size={16} weight="fill" />
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
