"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import { Crown, SpinnerGap } from "@phosphor-icons/react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  const { isPro, isFamily, isLoading } = useFeatureAccess();
  const { profile, userId } = useProfile();
  const [savingCountry, setSavingCountry] = useState(false);

  const handleCountryChange = async (value: string) => {
    if (!userId || value === profile?.country) return;
    setSavingCountry(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ country: value, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      // Reload to refresh all page data for the new country
      window.location.reload();
    } catch (error) {
      console.error("Error saving country:", error);
      setSavingCountry(false);
    }
  };

  return (
    <>
      {savingCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Switching region...</p>
          </div>
        </div>
      )}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-4"
        style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", height: "calc(3.5rem + var(--sat, 0px))" }}
      >
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!self-center h-4" />
          <div className="flex flex-col">
            <h1 className="font-semibold leading-tight">{title}</h1>
            {subtitle && <div className="leading-tight">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          {profile ? (
            <Select
              value={profile.country || "BH"}
              onValueChange={handleCountryChange}
              disabled={savingCountry}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs gap-1 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BH">🇧🇭 Bahrain</SelectItem>
                <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-8 w-[110px] rounded-md bg-muted animate-pulse" />
          )}
          {!isLoading && (isPro || isFamily) && (
            <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
              <Crown size={10} weight="fill" />
              Pro
            </Badge>
          )}
          <NotificationsDropdown />
          <MobileNavButton />
        </div>
      </header>
    </>
  );
}
