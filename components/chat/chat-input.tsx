"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Waveform } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask anything",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="p-4 bg-background">
      <div className="max-w-3xl mx-auto">
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
            {/* Left side - Plus button */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              <Plus size={20} />
            </Button>

            {/* Right side - Voice & Send */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                <Waveform size={20} />
              </Button>
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
        <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
          finauraa can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
