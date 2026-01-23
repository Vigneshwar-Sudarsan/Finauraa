"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChatHeader } from "./chat-header";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ConversationHistoryDrawer } from "./conversation-history-drawer";
import { useBankConnection } from "@/hooks/use-bank-connection";
import { Message, MessageContent } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Sparkle } from "@phosphor-icons/react";
import { SavingsGoalSheet } from "@/components/spending";

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
    "Welcome back! I'm your personal finance assistant.\nI can track your spending, manage budgets, monitor savings goals, and give you personalized financial advice.\nWhat would you like to focus on today?",
  richContent: [
    {
      type: "action-buttons",
      data: {
        actions: [
          { label: "Financial Health", action: "show-financial-health" },
          { label: "Spending Analysis", action: "analyze-spending" },
          { label: "Savings Goals", action: "view-savings-goals" },
        ],
      },
    },
  ],
  timestamp: new Date(),
};

// Welcome message for users who have bank but haven't chosen AI mode yet
const WELCOME_MESSAGE_CHOOSE_AI_MODE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Your bank account is connected! Before we start, let me explain how I can help you:",
  richContent: [
    {
      type: "ai-mode-intro",
    },
  ],
  timestamp: new Date(),
};

export function ChatContainer() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]); // Start empty, set after bank check
  const [isLoading, setIsLoading] = useState(false);
  const [hasBankConnected, setHasBankConnected] = useState(false);
  const [isCheckingBank, setIsCheckingBank] = useState(true);
  const [hasChosenAiMode, setHasChosenAiMode] = useState(true); // Default true, set false when showing intro
  const scrollRef = useRef<HTMLDivElement>(null);

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Savings Goal Sheet state
  const [savingsGoalSheetOpen, setSavingsGoalSheetOpen] = useState(false);
  const [savingsGoalSheetData, setSavingsGoalSheetData] = useState<{
    name?: string;
    suggestedAmount?: number;
  } | null>(null);

  // Bank connection with consent dialog
  const { connectBank, isConnecting: isConnectingBank, ConsentDialog } = useBankConnection({
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: `Connection failed: ${error}`,
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
    },
  });

  // Check for bank connection status on mount
  useEffect(() => {
    const checkBankConnection = async () => {
      try {
        const response = await fetch("/api/finance/summary");
        if (response.ok) {
          const data = await response.json();
          if (data.hasBankConnected) {
            setHasBankConnected(true);
            // Show AI mode intro if user hasn't chosen their mode yet
            if (!data.aiDataMode) {
              setMessages([WELCOME_MESSAGE_CHOOSE_AI_MODE]);
              setHasChosenAiMode(false);
            } else {
              setMessages([WELCOME_MESSAGE_WITH_BANK]);
              setHasChosenAiMode(true);
            }
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
      setHasChosenAiMode(false); // Show AI mode intro
      // Clear the URL params
      window.history.replaceState({}, "", "/");
      // Add success message with AI mode intro
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "welcome"),
        {
          id: generateId(),
          role: "assistant",
          content: "Your bank account is now connected! I can see your accounts and transactions.\n\nBefore we start, let me explain how I can help you:",
          richContent: [
            {
              type: "ai-mode-intro",
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

  // Save message to database
  const saveMessageToDb = useCallback(async (
    convId: string,
    role: "user" | "assistant",
    content: string,
    richContent?: MessageContent[]
  ) => {
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          content,
          rich_content: richContent || null,
        }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  }, []);

  // Add message and save to database (for action-triggered messages)
  const addAndSaveMessage = useCallback(async (
    message: Omit<Message, "id" | "timestamp">,
    currentConvId: string | null
  ) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Save to database if we have a conversation
    if (currentConvId) {
      saveMessageToDb(currentConvId, message.role, message.content, message.richContent);
    }

    return newMessage;
  }, [saveMessageToDb]);

  // Create a new conversation
  const createNewConversation = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const { conversation } = await response.json();
        return conversation.id;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  }, []);

  // Handle creating a new conversation
  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    // Reset to welcome message based on bank status
    if (hasBankConnected) {
      setMessages([WELCOME_MESSAGE_WITH_BANK]);
    } else {
      setMessages([WELCOME_MESSAGE_NO_BANK]);
    }
  }, [hasBankConnected]);

  // Load an existing conversation
  const handleSelectConversation = useCallback(async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`);
      if (response.ok) {
        const { conversation } = await response.json();
        setConversationId(convId);

        // Convert database messages to our Message format
        const loadedMessages: Message[] = conversation.messages.map(
          (msg: { id: string; role: "user" | "assistant"; content: string; rich_content?: MessageContent[]; created_at: string }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            richContent: msg.rich_content || undefined,
            timestamp: new Date(msg.created_at),
            actionsDisabled: true, // Disable actions on loaded messages
          })
        );

        // If no messages, show welcome message
        if (loadedMessages.length === 0) {
          if (hasBankConnected) {
            setMessages([WELCOME_MESSAGE_WITH_BANK]);
          } else {
            setMessages([WELCOME_MESSAGE_NO_BANK]);
          }
        } else {
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }, [hasBankConnected]);

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
    // Check if user is asking about AI modes/enhanced AI
    const lowerContent = content.toLowerCase();
    const aiModeKeywords = ["enhanced ai", "ai mode", "switch mode", "change mode", "upgrade ai", "pro mode", "privacy mode"];
    const isAskingAboutAiMode = aiModeKeywords.some(keyword => lowerContent.includes(keyword));

    if (isAskingAboutAiMode) {
      // Show the AI mode intro card
      addMessage({ role: "user", content });
      setHasChosenAiMode(false);
      addMessage({
        role: "assistant",
        content: "Here are the AI modes available. You can switch anytime:",
        richContent: [
          {
            type: "ai-mode-intro",
          },
        ],
      });
      return;
    }

    // Track if we need to show privacy mode notification
    const shouldShowPrivacyNotification = !hasChosenAiMode;

    // Auto-select privacy mode if user starts chatting without choosing
    if (!hasChosenAiMode) {
      try {
        await fetch("/api/user/ai-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "privacy-first" }),
        });
        setHasChosenAiMode(true);
      } catch (e) {
        console.error("Failed to auto-save AI mode:", e);
      }
    }

    // Create conversation if this is the first real message
    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await createNewConversation();
      if (currentConvId) {
        setConversationId(currentConvId);
      }
    }

    // Add user message first
    addMessage({ role: "user", content });

    // Show privacy mode notification after user message (if auto-selected)
    if (shouldShowPrivacyNotification) {
      addMessage({
        role: "assistant",
        content: "I've set you up with **Privacy Mode** - I'll help you with general guidance while keeping your exact amounts private. You can change this anytime by asking about \"AI mode\".\n\nNow, let me help you with that:",
      });
    }

    // Save user message to database
    if (currentConvId) {
      saveMessageToDb(currentConvId, "user", content);
    }

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

      // Save assistant response to database
      if (currentConvId) {
        saveMessageToDb(currentConvId, "assistant", data.message, data.richContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback response on error
      const errorMessage = error instanceof Error ? error.message : "I'm having trouble connecting right now.";
      const fallbackContent = errorMessage.includes("limit")
        ? errorMessage
        : "I'm having trouble connecting right now. Please try again.";

      addMessage({
        role: "assistant",
        content: fallbackContent,
      });

      // Save error response to database
      if (currentConvId) {
        saveMessageToDb(currentConvId, "assistant", fallbackContent);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, data?: Record<string, unknown>) => {
    // Disable the actions on the message that triggered this action
    disableLastMessageActions();

    // Ensure we have a conversation for saving messages
    let currentConvId = conversationId;
    if (!currentConvId && action !== "connect-bank") {
      currentConvId = await createNewConversation();
      if (currentConvId) {
        setConversationId(currentConvId);
      }
    }

    switch (action) {
      case "connect-bank":
        // Show consent dialog, then initiate Tarabut connection
        connectBank();
        break;

      case "analyze-spending":
        await addAndSaveMessage({
          role: "user",
          content: "Yes, analyze my spending",
        }, currentConvId);
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's your spending overview:",
          richContent: [
            {
              type: "spending-analysis",
              // No data passed - component will fetch real data from API
            },
          ],
        }, currentConvId);
        break;

      case "add-another-bank":
        // Redirect to Tarabut Connect to add another bank
        await addAndSaveMessage({
          role: "assistant",
          content: "Let's connect another bank account.",
        }, currentConvId);
        // Trigger the connect-bank flow
        handleAction("connect-bank");
        break;

      case "set-budget":
        // Check if this is a submission (has amount) or initial setup request
        if (data?.amount) {
          // User submitted a budget amount - save it via API
          const submittedCategory = data?.category as string;
          const submittedAmount = data?.amount as number;
          const submittedCurrency = data?.currency as string;
          await addAndSaveMessage({
            role: "user",
            content: `Set ${submittedCategory} budget to ${submittedCurrency} ${submittedAmount}`,
          }, currentConvId);

          try {
            const response = await fetch("/api/finance/budgets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: submittedCategory,
                amount: submittedAmount,
                currency: submittedCurrency,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to save budget");
            }

            const result = await response.json();
            const budget = result.budget;
            const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

            await addAndSaveMessage({
              role: "assistant",
              content: `Done! I've set your ${submittedCategory} budget to ${submittedCurrency} ${submittedAmount}/month. I'll let you know if you're getting close to the limit.`,
              richContent: [
                {
                  type: "budget-card",
                  data: {
                    category: budget.category,
                    spent: budget.spent,
                    limit: budget.amount,
                    currency: budget.currency,
                    month: currentMonth,
                  },
                },
              ],
            }, currentConvId);
          } catch (err) {
            console.error("Failed to save budget:", err);
            await addAndSaveMessage({
              role: "assistant",
              content: "Sorry, I couldn't save the budget. Please try again.",
              richContent: [
                {
                  type: "action-buttons",
                  data: {
                    actions: [{ label: "Try Again", action: "set-budget" }],
                  },
                },
              ],
            }, currentConvId);
          }
        } else {
          // Show interactive budget setup card
          const category = data?.category as string;
          await addAndSaveMessage({
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
          }, currentConvId);
        }
        break;

      case "cancel-budget":
        await addAndSaveMessage({
          role: "assistant",
          content: "No problem! Let me know if you want to set up a budget later.",
        }, currentConvId);
        break;

      case "show-transactions":
        await addAndSaveMessage({
          role: "assistant",
          content: "Here are your recent transactions:",
          richContent: [
            {
              type: "transactions-list",
              data: {
                limit: 10,
                category: data?.category as string | undefined,
              },
            },
          ],
        }, currentConvId);
        break;

      case "show-accounts":
        if (hasBankConnected) {
          await addAndSaveMessage({
            role: "assistant",
            content: "Here's your account overview:",
            richContent: [
              {
                type: "balance-card",
                // No data passed - component will fetch real data from API
              },
            ],
          }, currentConvId);
        }
        break;

      case "show-spending":
      case "track-spending":
      case "Track Spending":
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's your spending overview:",
          richContent: [
            {
              type: "spending-analysis",
            },
          ],
        }, currentConvId);
        break;

      case "view-balance":
      case "View Account Balance":
        if (hasBankConnected) {
          await addAndSaveMessage({
            role: "assistant",
            content: "Here's your account overview:",
            richContent: [
              {
                type: "balance-card",
              },
            ],
          }, currentConvId);
        } else {
          await addAndSaveMessage({
            role: "assistant",
            content: "You need to connect a bank account first to view your balance.",
            richContent: [
              {
                type: "action-buttons",
                data: {
                  actions: [{ label: "Connect Bank", action: "connect-bank" }],
                },
              },
            ],
          }, currentConvId);
        }
        break;

      case "Set Budget":
        await addAndSaveMessage({
          role: "assistant",
          content: "What category would you like to set a budget for?",
          richContent: [
            {
              type: "action-buttons",
              data: {
                actions: [
                  { label: "Groceries", action: "set-budget", data: { category: "groceries" } },
                  { label: "Dining", action: "set-budget", data: { category: "dining" } },
                  { label: "Shopping", action: "set-budget", data: { category: "shopping" } },
                ],
              },
            },
          ],
        }, currentConvId);
        break;

      case "Analyze Spending Patterns":
      case "analyze-patterns":
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's an analysis of your spending patterns:",
          richContent: [
            {
              type: "spending-analysis",
            },
          ],
        }, currentConvId);
        break;

      case "upgrade-for-enhanced-ai":
        // Save choice first, then redirect to upgrade page
        setHasChosenAiMode(true);
        try {
          await fetch("/api/user/ai-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "enhanced" }),
          });
        } catch (e) {
          console.error("Failed to save AI mode:", e);
        }
        window.location.href = "/dashboard/settings/subscription/plans";
        break;

      case "continue-privacy-mode":
        // Save the user's choice to the database
        setHasChosenAiMode(true);
        try {
          await fetch("/api/user/ai-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "privacy-first" }),
          });
        } catch (e) {
          console.error("Failed to save AI mode:", e);
        }
        await addAndSaveMessage({
          role: "assistant",
          content: "Great! You're all set with Privacy Mode. I'll give you helpful guidance while keeping your exact amounts private.\n\nWhat would you like to do first?",
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
        }, currentConvId);
        break;

      case "show-ai-modes":
        // Show the AI mode intro card again
        setHasChosenAiMode(false);
        await addAndSaveMessage({
          role: "assistant",
          content: "Here are the AI modes available. You can switch anytime:",
          richContent: [
            {
              type: "ai-mode-intro",
            },
          ],
        }, currentConvId);
        break;

      // === NEW FINANCE MANAGER ACTIONS ===

      case "create-budget":
        // Create a new budget with optional suggested amount
        const budgetCategory = (data?.category as string) || "general";
        const suggestedAmount = (data?.suggestedAmount as number) || 200;
        await addAndSaveMessage({
          role: "assistant",
          content: `Let's set up a budget for ${budgetCategory}. Based on your spending patterns, I'd suggest starting with ${suggestedAmount} BHD/month.`,
          richContent: [
            {
              type: "budget-card",
              data: {
                category: budgetCategory.toLowerCase(),
                isSetup: true,
                suggestedAmount: suggestedAmount,
                currency: "BHD",
              },
            },
          ],
        }, currentConvId);
        break;

      case "edit-budget":
        // Edit an existing budget
        const editCategory = (data?.category as string) || "general";
        await addAndSaveMessage({
          role: "assistant",
          content: `Let's update your ${editCategory} budget:`,
          richContent: [
            {
              type: "budget-card",
              data: {
                category: editCategory.toLowerCase(),
                isSetup: true,
                currency: "BHD",
              },
            },
          ],
        }, currentConvId);
        break;

      case "budget-overview":
        // Show all budgets
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's an overview of all your budgets:",
          richContent: [
            {
              type: "budget-overview",
            },
          ],
        }, currentConvId);
        break;

      case "create-savings-goal":
        // Open savings goal drawer
        const goalName = (data?.name as string) || "";
        const goalAmount = (data?.suggestedAmount as number) || 1000;
        setSavingsGoalSheetData({
          name: goalName,
          suggestedAmount: goalAmount,
        });
        setSavingsGoalSheetOpen(true);
        break;

      case "open-savings-goal-sheet":
        // Open the savings goal drawer (triggered from preview card)
        setSavingsGoalSheetData({
          name: (data?.name as string) || "",
          suggestedAmount: (data?.suggestedAmount as number) || 1000,
        });
        setSavingsGoalSheetOpen(true);
        break;

      case "view-savings-goals":
        // Show all savings goals
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's your savings goals progress:",
          richContent: [
            {
              type: "savings-goals",
            },
          ],
        }, currentConvId);
        break;

      case "savings-goal-created":
        // Goal was successfully created via the setup form
        const createdGoalName = (data?.name as string) || "your goal";
        await addAndSaveMessage({
          role: "assistant",
          content: `Great! I've successfully created "${createdGoalName}" for you. Here's your updated savings goals:`,
          richContent: [
            {
              type: "savings-goals",
            },
          ],
        }, currentConvId);
        break;

      case "show-financial-health":
        // Show financial health score
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's your financial health assessment:",
          richContent: [
            {
              type: "financial-health",
            },
          ],
        }, currentConvId);
        break;

      case "show-cash-flow":
        // Show cash flow analysis and predictions
        await addAndSaveMessage({
          role: "assistant",
          content: "Here's your cash flow analysis:",
          richContent: [
            {
              type: "cash-flow",
            },
          ],
        }, currentConvId);
        break;

      case "view-recurring":
        // Show recurring expenses
        await addAndSaveMessage({
          role: "assistant",
          content: "Here are your recurring expenses and upcoming bills:",
          richContent: [
            {
              type: "recurring-expenses",
            },
          ],
        }, currentConvId);
        break;

      case "export-data":
        // Export financial data
        await addAndSaveMessage({
          role: "assistant",
          content: "I can help you export your financial data. What format would you prefer?",
          richContent: [
            {
              type: "action-buttons",
              data: {
                actions: [
                  { label: "CSV Export", action: "export-csv" },
                  { label: "PDF Report", action: "export-pdf" },
                ],
              },
            },
          ],
        }, currentConvId);
        break;

      case "export-csv":
        // Trigger CSV export
        window.open("/api/finance/export?format=csv", "_blank");
        await addAndSaveMessage({
          role: "assistant",
          content: "Your CSV export has started downloading. It includes your transactions, budgets, and savings goals.",
        }, currentConvId);
        break;

      case "export-pdf":
        // Trigger PDF export
        window.open("/api/finance/export?format=pdf", "_blank");
        await addAndSaveMessage({
          role: "assistant",
          content: "Your PDF report is being generated. It includes a summary of your financial health, spending analysis, and progress on goals.",
        }, currentConvId);
        break;

      default:
        // If action looks like a user message, send it to the AI
        if (action && !action.includes("-") && action.length > 10) {
          handleSendMessage(action);
        } else {
          console.log("Unknown action:", action, data);
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        onNewConversation={handleNewConversation}
        onOpenHistory={() => setHistoryOpen(true)}
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

          {/* Bank connecting indicator */}
          {isConnectingBank && (
            <div className="py-6 animate-in fade-in duration-300">
              <div className="max-w-3xl mx-auto px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-6 rounded-full bg-foreground flex items-center justify-center">
                    <Sparkle size={12} weight="fill" className="text-background" />
                  </div>
                  <span className="text-sm font-medium text-foreground">finauraa</span>
                </div>
                <div className="pl-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="size-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Waiting for bank connection...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator - Claude style */}
          {isLoading && !isConnectingBank && (
            <div className="py-6">
              <div className="max-w-3xl mx-auto px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-6 rounded-full bg-foreground flex items-center justify-center">
                    <Sparkle size={12} weight="fill" className="text-background" />
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
      <ChatInput
        onSend={handleSendMessage}
        onConnectBank={() => handleAction("connect-bank")}
        disabled={isLoading || isCheckingBank}
      />

      {/* Conversation History Drawer */}
      <ConversationHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectConversation={handleSelectConversation}
        currentConversationId={conversationId}
      />

      {/* Savings Goal Sheet */}
      <SavingsGoalSheet
        open={savingsGoalSheetOpen}
        onOpenChange={setSavingsGoalSheetOpen}
        onSuccess={() => {
          // When goal is created from sheet, show success message in chat
          handleAction("savings-goal-created", { name: savingsGoalSheetData?.name || "your goal" });
          setSavingsGoalSheetData(null);
        }}
        existingGoal={null}
        defaultCurrency="BHD"
      />

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
