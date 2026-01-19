"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileNavButton } from "@/components/mobile-nav";

interface ChatHeaderProps {
  isPro?: boolean;
}

export function ChatHeader({ isPro = false }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
      {/* Left - Menu Toggle */}
      <SidebarTrigger className="text-muted-foreground" />

      {/* Center - Pro badge */}
      <div className="flex items-center">
        {isPro && (
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            PRO
          </span>
        )}
      </div>

      {/* Right - Dashboard button */}
      <MobileNavButton />
    </header>
  );
}
