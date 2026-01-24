"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Bank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GuideSpot } from "./feature-guide";

interface ChatInputProps {
  onSend: (message: string) => void;
  onConnectBank?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onConnectBank,
  disabled = false,
  placeholder = "Ask anything",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fix hydration mismatch with Radix Popover
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConnectBank = () => {
    setPopoverOpen(false);
    onConnectBank?.();
  };

  return (
    <div className="p-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <GuideSpot id="chat-input" side="top" align="center">
          <div
            className={cn(
              "relative flex flex-col rounded-xl border border-border bg-muted/50 transition-all",
              "focus-within:bg-muted/80"
            )}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-6",
                "placeholder:text-muted-foreground focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "max-h-[200px] min-h-[44px]"
              )}
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-2 pb-2">
              {/* Left side - Plus button with menu */}
              {isMounted ? (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={disabled}
                    >
                      <Plus size={20} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="top"
                    className="w-56 p-1.5"
                  >
                    <button
                      onClick={handleConnectBank}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Bank size={18} className="text-muted-foreground" />
                      <span>Connect to bank</span>
                    </button>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <Plus size={20} />
                </Button>
              )}

              {/* Right side - Send */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={handleSend}
                  disabled={disabled || !message.trim()}
                  className={cn(
                    "rounded-full transition-colors",
                    message.trim()
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <ArrowUp size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </div>
        </GuideSpot>
        <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
          finauraa can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
