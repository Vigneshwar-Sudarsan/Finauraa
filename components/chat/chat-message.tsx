"use client";

import { cn } from "@/lib/utils";
import { Message } from "@/lib/types";
import { Sparkle } from "@phosphor-icons/react";
import { RichContent } from "./rich-content";

interface ChatMessageProps {
  message: Message;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("py-6", isAssistant ? "bg-transparent" : "bg-transparent")}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Role indicator - only for assistant */}
        {isAssistant && (
          <div className="flex items-center gap-2 mb-3">
            <div className="size-6 rounded-full bg-foreground flex items-center justify-center">
              <Sparkle size={12} weight="fill" className="text-background" />
            </div>
            <span className="text-sm font-medium text-foreground">finauraa</span>
          </div>
        )}

        {/* User message - right aligned label */}
        {!isAssistant && (
          <div className="flex justify-end mb-2">
            <span className="text-sm font-medium text-foreground">You</span>
          </div>
        )}

        {/* Message content */}
        <div className={cn("space-y-4", !isAssistant && "flex flex-col items-end")}>
          {/* Text content */}
          {message.content && (
            <div
              className={cn(
                "text-sm leading-normal",
                isAssistant
                  ? "text-foreground pl-8"
                  : "bg-muted px-4 py-2.5 rounded-xl max-w-[85%] text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )}

          {/* Rich content (cards, actions, etc.) */}
          {message.richContent?.map((content, index) => (
            <div key={index} className={cn(isAssistant ? "pl-8 w-full" : "w-full flex justify-end")}>
              <RichContent
                content={content}
                onAction={onAction}
                disabled={message.actionsDisabled}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
