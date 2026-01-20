"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function DashboardHeader({ title, actions }: DashboardHeaderProps) {
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
        <MobileNavButton />
      </div>
    </header>
  );
}
