"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Badge } from "@/components/ui/badge";
import { Crown } from "@phosphor-icons/react";
import { NotificationsDropdown } from "./notifications-dropdown";

interface DashboardHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function DashboardHeader({ title, actions }: DashboardHeaderProps) {
  const { isPro, isFamily, isLoading } = useFeatureAccess();

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b px-4"
      style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", height: "calc(3.5rem + var(--sat, 0px))" }}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="!self-center h-4" />
        <h1 className="font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
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
  );
}
