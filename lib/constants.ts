// Category icons and colors
export const CATEGORY_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  groceries: { icon: "🛒", color: "#22c55e", label: "Groceries" },
  dining: { icon: "🍽️", color: "#f97316", label: "Dining" },
  transport: { icon: "🚗", color: "#3b82f6", label: "Transport" },
  shopping: { icon: "🛍️", color: "#ec4899", label: "Shopping" },
  bills: { icon: "📄", color: "#8b5cf6", label: "Bills" },
  entertainment: { icon: "🎬", color: "#ef4444", label: "Entertainment" },
  health: { icon: "💊", color: "#14b8a6", label: "Health" },
  education: { icon: "📚", color: "#6366f1", label: "Education" },
  travel: { icon: "✈️", color: "#0ea5e9", label: "Travel" },
  coffee: { icon: "☕", color: "#a16207", label: "Coffee" },
  fuel: { icon: "⛽", color: "#71717a", label: "Fuel" },
  subscriptions: { icon: "📱", color: "#7c3aed", label: "Subscriptions" },
  other: { icon: "📦", color: "#6b7280", label: "Other" },
};

// Free tier limits
export const FREE_TIER = {
  queryLimit: 30,
  bankLimit: 1,
  transactionHistoryDays: 30,
};

// Pro tier pricing
export const PRO_TIER = {
  priceMonthly: 7.99, // USD
  priceCurrency: "USD",
};
