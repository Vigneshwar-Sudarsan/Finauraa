"use client";

import { MessageSquare, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface ChatHeaderProps {
  mode: "chat" | "dashboard";
  onModeChange: (mode: "chat" | "dashboard") => void;
  isPro?: boolean;
}

export function ChatHeader({
  mode,
  onModeChange,
  isPro = false,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
      {/* Left - Menu Toggle */}
      <SidebarTrigger className="text-muted-foreground" />

      {/* Center - Spacer or Pro badge */}
      <div className="flex items-center">
        {isPro && (
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            PRO
          </span>
        )}
      </div>

      {/* Right - Mode toggle */}
      <div className="flex items-center border border-border/60 rounded-full p-0.5">
        <button
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
            mode === "chat"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onModeChange("chat")}
        >
          <MessageSquare className="size-3.5" />
        </button>
        <button
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
            mode === "dashboard"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onModeChange("dashboard")}
        >
          <LayoutDashboard className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
