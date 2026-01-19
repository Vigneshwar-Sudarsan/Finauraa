// Message types for chat interface
export type MessageRole = "user" | "assistant";

export type MessageContentType =
  | "text"
  | "balance-card"
  | "spending-card"
  | "bank-connected"
  | "spending-analysis"
  | "budget-card"
  | "payment-confirmation"
  | "action-buttons";

export interface MessageContent {
  type: MessageContentType;
  data?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  richContent?: MessageContent[];
  timestamp: Date;
  actionsDisabled?: boolean;
}

// Bank types
export interface BankAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountType: string;
  accountNumber: string; // masked
  balance: number;
  currency: string;
  lastSynced: Date;
}

// Transaction types
export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  categoryIcon: string;
  merchantName?: string;
  date: Date;
}

// Budget types
export interface Budget {
  id: string;
  category: string;
  categoryIcon: string;
  limit: number;
  spent: number;
  currency: string;
  month: string;
}

// Spending analysis
export interface SpendingCategory {
  category: string;
  icon: string;
  amount: number;
  percentage: number;
  color: string;
}

// User state
export interface UserState {
  isAuthenticated: boolean;
  hasBankConnected: boolean;
  queryCount: number;
  queryLimit: number;
  isPro: boolean;
}
