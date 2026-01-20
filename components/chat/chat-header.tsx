"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileNavButton } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Plus, ClockCounterClockwise } from "@phosphor-icons/react";

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
        <SidebarTrigger className="text-muted-foreground" />
        {onNewConversation && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewConversation}
            className="size-8 text-muted-foreground"
          >
            <Plus size={18} />
          </Button>
        )}
        {onOpenHistory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenHistory}
            className="size-8 text-muted-foreground"
          >
            <ClockCounterClockwise size={18} />
          </Button>
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
      <MobileNavButton />
    </header>
  );
}
