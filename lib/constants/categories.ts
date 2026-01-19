// Shared category definitions for spending, budgets, and manual transactions

export const EXPENSE_CATEGORIES = [
  { value: "shopping", label: "Shopping", icon: "ShoppingCart" },
  { value: "groceries", label: "Groceries", icon: "ShoppingCart" },
  { value: "food", label: "Food & Dining", icon: "Hamburger" },
  { value: "transport", label: "Transport", icon: "Car" },
  { value: "utilities", label: "Utilities", icon: "Lightning" },
  { value: "entertainment", label: "Entertainment", icon: "GameController" },
  { value: "health", label: "Healthcare", icon: "Heartbeat" },
  { value: "travel", label: "Travel", icon: "Airplane" },
  { value: "housing", label: "Housing", icon: "House" },
  { value: "subscriptions", label: "Subscriptions", icon: "CreditCard" },
  { value: "other", label: "Other", icon: "DotsThree" },
] as const;

export const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary & Wages", icon: "Briefcase" },
  { value: "freelance", label: "Freelance", icon: "Briefcase" },
  { value: "investments", label: "Investments", icon: "TrendUp" },
  { value: "rental", label: "Rental Income", icon: "House" },
  { value: "other_income", label: "Other Income", icon: "Money" },
] as const;

export const SAVINGS_GOAL_CATEGORIES = [
  { value: "emergency", label: "Emergency Fund", icon: "ShieldCheck" },
  { value: "vacation", label: "Vacation", icon: "Airplane" },
  { value: "car", label: "Car", icon: "Car" },
  { value: "house", label: "House", icon: "House" },
  { value: "education", label: "Education", icon: "GraduationCap" },
  { value: "retirement", label: "Retirement", icon: "Bank" },
  { value: "other", label: "Other", icon: "PiggyBank" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["value"];
export type SavingsGoalCategory = (typeof SAVINGS_GOAL_CATEGORIES)[number]["value"];

// Helper to get category label
export function getCategoryLabel(
  value: string,
  type: "expense" | "income" | "savings" = "expense"
): string {
  const categories =
    type === "expense"
      ? EXPENSE_CATEGORIES
      : type === "income"
        ? INCOME_CATEGORIES
        : SAVINGS_GOAL_CATEGORIES;

  const category = categories.find((c) => c.value === value);
  return category?.label ?? value;
}

// Helper to get category icon name
export function getCategoryIconName(
  value: string,
  type: "expense" | "income" | "savings" = "expense"
): string {
  const categories =
    type === "expense"
      ? EXPENSE_CATEGORIES
      : type === "income"
        ? INCOME_CATEGORIES
        : SAVINGS_GOAL_CATEGORIES;

  const category = categories.find((c) => c.value === value);
  return category?.icon ?? "DotsThree";
}
