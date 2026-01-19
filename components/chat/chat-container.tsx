"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChatHeader } from "./chat-header";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { Message, MessageContent } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Sparkles } from "lucide-react";

// Skeleton loader for initial bank check
function WelcomeSkeleton() {
  return (
    <div className="py-6 animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto px-4">
        {/* Avatar and name skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="size-6 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        {/* Message content skeleton */}
        <div className="pl-8 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          {/* Button skeleton */}
          <div className="pt-3 flex gap-2">
            <div className="h-9 w-36 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Welcome message for users without bank connection
const WELCOME_MESSAGE_NO_BANK: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm your financial assistant.\nI can help you track spending, set budgets, and manage your money.\nTo get started, I'll need access to your bank account.",
  richContent: [
    {
      type: "action-buttons",
      data: {
        actions: [
          { label: "Connect Bank Account", action: "connect-bank" },
        ],
      },
    },
  ],
  timestamp: new Date(),
};

// Welcome message for users with bank connection
const WELCOME_MESSAGE_WITH_BANK: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome back! Your bank is connected.\nI can help you track spending, set budgets, and manage your money.\nWhat would you like to know?",
  richContent: [
    {
      type: "action-buttons",
      data: {
        actions: [
          { label: "Show Balance", action: "show-accounts" },
          { label: "Analyze Spending", action: "analyze-spending" },
        ],
      },
    },
  ],
  timestamp: new Date(),
};

export function ChatContainer() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"chat" | "dashboard">("chat");
  const [messages, setMessages] = useState<Message[]>([]); // Start empty, set after bank check
  const [isLoading, setIsLoading] = useState(false);
  const [hasBankConnected, setHasBankConnected] = useState(false);
  const [isCheckingBank, setIsCheckingBank] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for bank connection status on mount
  useEffect(() => {
    const checkBankConnection = async () => {
      try {
        const response = await fetch("/api/finance/summary");
        if (response.ok) {
          const data = await response.json();
          if (data.hasBankConnected) {
            setHasBankConnected(true);
            setMessages([WELCOME_MESSAGE_WITH_BANK]);
          } else {
            setMessages([WELCOME_MESSAGE_NO_BANK]);
          }
        } else {
          // API error, default to no bank
          setMessages([WELCOME_MESSAGE_NO_BANK]);
        }
      } catch (error) {
        console.error("Failed to check bank connection:", error);
        // On error, default to no bank connected
        setMessages([WELCOME_MESSAGE_NO_BANK]);
      } finally {
        setIsCheckingBank(false);
      }
    };

    checkBankConnection();
  }, []);

  // Handle bank connection callback
  useEffect(() => {
    const bankConnected = searchParams.get("bank_connected");
    const bankError = searchParams.get("bank_error");

    if (bankConnected === "true") {
      setHasBankConnected(true);
      // Clear the URL params
      window.history.replaceState({}, "", "/");
      // Add success message
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "welcome"),
        {
          id: generateId(),
          role: "assistant",
          content: "Your bank account is now connected! I can see your accounts and transactions.",
          richContent: [
            {
              type: "action-buttons",
              data: {
                actions: [
                  { label: "Show Balance", action: "show-accounts" },
                  { label: "Analyze Spending", action: "analyze-spending" },
                ],
              },
            },
          ],
          timestamp: new Date(),
        },
      ]);
    }

    if (bankError) {
      // Clear the URL params
      window.history.replaceState({}, "", "/");
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: `There was an issue connecting your bank: ${decodeURIComponent(bankError)}. Please try again.`,
          richContent: [
            {
              type: "action-buttons",
              data: {
                actions: [{ label: "Try Again", action: "connect-bank" }],
              },
            },
          ],
          timestamp: new Date(),
        },
      ]);
    }
  }, [searchParams]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  // Disable actions on the last message with rich content
  const disableLastMessageActions = () => {
    setMessages((prev) => {
      // Find the last message with richContent from the end
      const lastIndex = prev.findLastIndex(
        (m) => m.richContent && m.richContent.length > 0 && !m.actionsDisabled
      );
      if (lastIndex === -1) return prev;

      const updated = [...prev];
      updated[lastIndex] = { ...updated[lastIndex], actionsDisabled: true };
      return updated;
    });
  };

  // Build conversation history for AI (only message content, no financial data)
  const getConversationHistory = useCallback(() => {
    return messages
      .filter((m) => m.id !== "welcome") // Exclude welcome message
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    addMessage({ role: "user", content });

    setIsLoading(true);

    try {
      // Build conversation history including the new message
      // NOTE: We only send message content, never financial data
      // The server fetches user context securely from the database
      const history = [
        ...getConversationHistory(),
        { role: "user" as const, content },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: history,
          // No userContext sent - server fetches it securely
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      // Add assistant response
      addMessage({
        role: "assistant",
        content: data.message,
        richContent: data.richContent as MessageContent[],
      });
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback response on error
      const errorMessage = error instanceof Error ? error.message : "I'm having trouble connecting right now.";
      addMessage({
        role: "assistant",
        content: errorMessage.includes("limit")
          ? errorMessage
          : "I'm having trouble connecting right now. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, data?: Record<string, unknown>) => {
    // Disable the actions on the message that triggered this action
    disableLastMessageActions();

    switch (action) {
      case "connect-bank":
        // Directly initiate Tarabut connection - user selects bank in Tarabut Connect UI
        addMessage({
          role: "assistant",
          content: "Connecting to Tarabut Open Banking...\n\nYou'll be redirected to select your bank and authorize access.",
        });

        try {
          const response = await fetch("/api/tarabut/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to connect");
          }

          const { authorizationUrl } = await response.json();

          // Redirect to Tarabut Connect where user selects their bank
          window.location.href = authorizationUrl;
        } catch (err) {
          addMessage({
            role: "assistant",
            content: `Connection failed: ${err instanceof Error ? err.message : "Please try again"}`,
            richContent: [
              {
                type: "action-buttons",
                data: {
                  actions: [{ label: "Try Again", action: "connect-bank" }],
                },
              },
            ],
          });
        }
        break;

      case "analyze-spending":
        addMessage({
          role: "user",
          content: "Yes, analyze my spending",
        });
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: "Here's your spending overview for the last 90 days:",
            richContent: [
              {
                type: "spending-analysis",
                data: {
                  totalSpent: 1847.3,
                  currency: "BHD",
                  period: "Last 90 days",
                  topCategory: "Groceries",
                  categories: [
                    { category: "groceries", amount: 456, percentage: 25 },
                    { category: "bills", amount: 389, percentage: 21 },
                    { category: "dining", amount: 312, percentage: 17 },
                    { category: "transport", amount: 234, percentage: 13 },
                    { category: "shopping", amount: 198, percentage: 11 },
                    { category: "other", amount: 258, percentage: 14 },
                  ],
                },
              },
            ],
          });
        }, 1000);
        break;

      case "add-another-bank":
        // Redirect to Tarabut Connect to add another bank
        addMessage({
          role: "assistant",
          content: "Let's connect another bank account.",
        });
        // Trigger the connect-bank flow
        handleAction("connect-bank");
        break;

      case "set-budget":
        // Check if this is a submission (has amount) or initial setup request
        if (data?.amount) {
          // User submitted a budget amount
          const submittedCategory = data?.category as string;
          const submittedAmount = data?.amount as number;
          const submittedCurrency = data?.currency as string;
          addMessage({
            role: "user",
            content: `Set ${submittedCategory} budget to ${submittedCurrency} ${submittedAmount}`,
          });
          setTimeout(() => {
            addMessage({
              role: "assistant",
              content: `Done! I've set your ${submittedCategory} budget to ${submittedCurrency} ${submittedAmount}/month. I'll let you know if you're getting close to the limit.`,
              richContent: [
                {
                  type: "budget-card",
                  data: {
                    category: submittedCategory?.toLowerCase() ?? "groceries",
                    spent: 156.3,
                    limit: submittedAmount,
                    currency: submittedCurrency,
                    month: "January",
                  },
                },
              ],
            });
          }, 500);
        } else {
          // Show interactive budget setup card
          const category = data?.category as string;
          addMessage({
            role: "assistant",
            content: `Let's set up a budget for ${category}. How much would you like to spend per month?`,
            richContent: [
              {
                type: "budget-card",
                data: {
                  category: category?.toLowerCase() ?? "groceries",
                  isSetup: true,
                  suggestedAmount: 200,
                  currency: "BHD",
                },
              },
            ],
          });
        }
        break;

      case "cancel-budget":
        addMessage({
          role: "assistant",
          content: "No problem! Let me know if you want to set up a budget later.",
        });
        break;

      case "show-transactions":
        addMessage({
          role: "assistant",
          content: "Here are your recent transactions. You can switch to Dashboard mode for a full list.",
        });
        break;

      case "show-accounts":
        if (hasBankConnected) {
          addMessage({
            role: "assistant",
            content: "Here's your connected account:",
            richContent: [
              {
                type: "balance-card",
                data: {
                  balance: 2450.75,
                  currency: "BHD",
                  accountCount: 1,
                },
              },
            ],
          });
        }
        break;

      case "show-spending":
        handleSendMessage("Show me my spending");
        break;

      default:
        console.log("Unknown action:", action, data);
    }
  };

  if (mode === "dashboard") {
    // Dashboard mode - placeholder for now
    return (
      <div className="flex flex-col h-full bg-background">
        <ChatHeader
          mode={mode}
          onModeChange={setMode}
          isPro={false}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Dashboard Mode</p>
            <p className="text-sm">Coming soon...</p>
            <button
              onClick={() => setMode("chat")}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Switch to Chat Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        mode={mode}
        onModeChange={setMode}
        isPro={false}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="min-h-full">
          {/* Show skeleton while checking bank connection */}
          {isCheckingBank && <WelcomeSkeleton />}

          {/* Show messages once bank check is complete */}
          {!isCheckingBank && messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onAction={handleAction}
            />
          ))}

          {/* Loading indicator - Claude style */}
          {isLoading && (
            <div className="py-6">
              <div className="max-w-3xl mx-auto px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-6 rounded-full bg-foreground flex items-center justify-center">
                    <Sparkles className="size-3 text-background" />
                  </div>
                  <span className="text-sm font-medium text-foreground">finauraa</span>
                </div>
                <div className="pl-8">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 bg-foreground/40 rounded-full animate-pulse" />
                    <div className="size-1.5 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <div className="size-1.5 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading || isCheckingBank} />
    </div>
  );
}
