"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatCircle, Trash, SpinnerGap } from "@phosphor-icons/react";

interface Conversation {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  created_at: string;
  updated_at: string;
}

interface ConversationHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string | null;
}

export function ConversationHistoryDrawer({
  open,
  onOpenChange,
  onSelectConversation,
  currentConversationId,
}: ConversationHistoryDrawerProps) {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open, fetchConversations]);

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setDeletingId(conversationId);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent
        className={
          isMobile
            ? "!max-h-[85vh] h-[85vh] flex flex-col"
            : "h-full w-full max-w-md flex flex-col"
        }
      >
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              Conversation History
            </DrawerTitle>
            <DrawerDescription
              className={`${isMobile ? "text-center" : ""} text-muted-foreground`}
            >
              Your previous conversations
            </DrawerDescription>
          </DrawerHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-lg border space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && conversations.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<ChatCircle size={28} className="text-muted-foreground" />}
                title="No conversations yet"
                description="Start a new conversation to see your history here."
              />
            </div>
          )}

          {/* Conversations List */}
          {!isLoading && conversations.length > 0 && (
            <ItemGroup>
              {conversations.map((conversation, index) => {
                const isActive = conversation.id === currentConversationId;
                const isDeleting = deletingId === conversation.id;

                return (
                  <div key={conversation.id}>
                    {index > 0 && <ItemSeparator />}
                    <Item
                      variant="default"
                      size="sm"
                      className={`cursor-pointer transition-colors ${
                        isActive ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelect(conversation.id)}
                    >
                      <ItemContent>
                        <ItemTitle className="line-clamp-1">
                          {conversation.title}
                        </ItemTitle>
                        <ItemDescription className="line-clamp-1">
                          {formatDistanceToNow(new Date(conversation.updated_at), {
                            addSuffix: true,
                          })}
                          {" · "}
                          {conversation.messageCount} message
                          {conversation.messageCount !== 1 ? "s" : ""}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(e, conversation.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <SpinnerGap size={16} className="animate-spin" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </Button>
                      </ItemActions>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
