// Message types for chat interface
export type MessageRole = "user" | "assistant";

export type MessageContentType =
  | "text"
  | "balance-card"
  | "bank-connected"
  | "spending-analysis"
  | "budget-card"
  | "budget-overview"
  | "transactions-list"
  | "action-buttons"
  | "ai-mode-intro"
  | "financial-health"
  | "cash-flow"
  | "savings-goals"
  | "savings-goal-setup"
  | "recurring-expenses";

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

// Family types
export type FamilyMemberRole = "owner" | "admin" | "member";
export type FamilyMemberStatus = "pending" | "active" | "removed";

export interface FamilyGroup {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  role: FamilyMemberRole;
  invited_by: string;
  invited_at: string;
  joined_at: string | null;
  status: FamilyMemberStatus;
  invitation_token?: string | null;
  invitation_expires_at?: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface FamilyGroupWithMembers extends FamilyGroup {
  members: FamilyMember[];
  member_count: number;
  pending_count: number;
}
