"use client";

import {
  ShoppingCart,
  Car,
  Hamburger,
  Lightning,
  CreditCard,
  House,
  Heartbeat,
  GameController,
  Airplane,
  DotsThree,
  Money,
  Briefcase,
  Bank,
  Coffee,
  GasPump,
  type Icon,
} from "@phosphor-icons/react";

// Type for icon components
export type IconComponent = Icon;

// Category icons mapping - shared across all transaction components
export const CATEGORY_ICONS: Record<string, IconComponent> = {
  // Shopping
  shopping: ShoppingCart,
  groceries: ShoppingCart,

  // Transport
  transport: Car,
  transportation: Car,
  fuel: GasPump,

  // Food & Dining
  food: Hamburger,
  dining: Hamburger,
  restaurants: Hamburger,
  coffee: Coffee,

  // Bills & Utilities
  utilities: Lightning,
  bills: Lightning,
  subscriptions: CreditCard,
  payments: CreditCard,

  // Housing
  housing: House,
  rent: House,
  mortgages: House,

  // Health
  health: Heartbeat,
  healthcare: Heartbeat,

  // Entertainment & Travel
  entertainment: GameController,
  travel: Airplane,

  // Income
  "salary & wages": Briefcase,
  salary: Briefcase,
  freelance: Briefcase,
  "retirement & pensions": Bank,
  "other income": Money,
  income: Money,
  investments: Bank,

  // Other
  transfer: Bank,
  "other expenses": DotsThree,
  "other loans": CreditCard,
  other: DotsThree,
};

// Category display labels
export const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  shopping: "Shopping",
  dining: "Dining",
  food: "Food & Dining",
  restaurants: "Restaurants",
  transport: "Transport",
  transportation: "Transport",
  fuel: "Fuel",
  bills: "Bills",
  utilities: "Utilities",
  subscriptions: "Subscriptions",
  payments: "Payments",
  housing: "Housing",
  rent: "Rent",
  mortgages: "Mortgage",
  health: "Health",
  healthcare: "Healthcare",
  entertainment: "Entertainment",
  travel: "Travel",
  coffee: "Coffee",
  "salary & wages": "Salary",
  salary: "Salary",
  income: "Income",
  "other income": "Other Income",
  transfer: "Transfer",
  other: "Other",
  "other expenses": "Other",
};

/**
 * Get the icon component for a category
 */
export function getCategoryIcon(categoryName: string): IconComponent {
  const key = categoryName.toLowerCase();
  return CATEGORY_ICONS[key] || DotsThree;
}

/**
 * Get the display label for a category
 */
export function getCategoryLabel(categoryName: string): string {
  const key = categoryName.toLowerCase();
  return CATEGORY_LABELS[key] || formatCategoryName(categoryName);
}

/**
 * Format a category name for display (capitalize each word)
 */
export function formatCategoryName(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
