"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileNavButton } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Plus, ClockCounterClockwise } from "@phosphor-icons/react";
import { GuideSpot } from "./feature-guide";

interface ChatHeaderProps {
  isPro?: boolean;
  onNewConversation?: () => void;
  onOpenHistory?: () => void;
}

export function ChatHeader({
  isPro = false,
  onNewConversation,
  onOpenHistory,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border/40" style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))" }}>
      {/* Left - Menu Toggle + New Chat + History */}
      <div className="flex items-center gap-1">
        <GuideSpot id="sidebar-menu" side="bottom" align="start">
          <SidebarTrigger className="text-muted-foreground" />
        </GuideSpot>
        {onNewConversation && (
          <GuideSpot id="new-chat" side="bottom" align="start">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewConversation}
              className="size-8 text-muted-foreground"
            >
              <Plus size={18} />
            </Button>
          </GuideSpot>
        )}
        {onOpenHistory && (
          <GuideSpot id="history" side="bottom" align="start">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenHistory}
              className="size-8 text-muted-foreground"
            >
              <ClockCounterClockwise size={18} />
            </Button>
          </GuideSpot>
        )}
      </div>

      {/* Center - Pro badge */}
      <div className="flex items-center">
        {isPro && (
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            PRO
          </span>
        )}
      </div>

      {/* Right - Dashboard button */}
      <GuideSpot id="dashboard-switch" side="bottom" align="end">
        <MobileNavButton />
      </GuideSpot>
    </header>
  );
}
