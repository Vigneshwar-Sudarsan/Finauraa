"use client";

import { useState, useEffect, useCallback } from "react";

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
}

interface CategoriesState {
  expense: Category[];
  income: Category[];
  source: "transactions" | "fallback";
  isLoading: boolean;
  error: string | null;
}

interface UseCategoriesHook {
  expenseCategories: Category[];
  incomeCategories: Category[];
  savingsCategories: Category[];
  allCategories: Category[];
  source: "transactions" | "fallback";
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCategoryLabel: (id: string, type?: "expense" | "income" | "savings") => string;
  getCategoryById: (id: string) => Category | undefined;
}

// Fallback categories (same as API fallback)
const FALLBACK_EXPENSE_CATEGORIES: Category[] = [
  { id: "shopping", name: "Shopping", parentId: null, icon: null },
  { id: "groceries", name: "Groceries", parentId: null, icon: null },
  { id: "food", name: "Food & Dining", parentId: null, icon: null },
  { id: "transport", name: "Transport", parentId: null, icon: null },
  { id: "utilities", name: "Utilities", parentId: null, icon: null },
  { id: "entertainment", name: "Entertainment", parentId: null, icon: null },
  { id: "health", name: "Healthcare", parentId: null, icon: null },
  { id: "travel", name: "Travel", parentId: null, icon: null },
  { id: "housing", name: "Housing", parentId: null, icon: null },
  { id: "subscriptions", name: "Subscriptions", parentId: null, icon: null },
  { id: "other", name: "Other", parentId: null, icon: null },
];

const FALLBACK_INCOME_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary & Wages", parentId: null, icon: null },
  { id: "freelance", name: "Freelance", parentId: null, icon: null },
  { id: "investments", name: "Investments", parentId: null, icon: null },
  { id: "rental", name: "Rental Income", parentId: null, icon: null },
  { id: "other_income", name: "Other Income", parentId: null, icon: null },
];

// Savings goal categories (not from Tarabut, always static)
const SAVINGS_GOAL_CATEGORIES: Category[] = [
  { id: "emergency", name: "Emergency Fund", parentId: null, icon: null },
  { id: "vacation", name: "Vacation", parentId: null, icon: null },
  { id: "car", name: "Car", parentId: null, icon: null },
  { id: "house", name: "House", parentId: null, icon: null },
  { id: "education", name: "Education", parentId: null, icon: null },
  { id: "retirement", name: "Retirement", parentId: null, icon: null },
  { id: "other", name: "Other", parentId: null, icon: null },
];

/**
 * Hook for fetching and using transaction categories
 * Fetches from Tarabut API when available, falls back to default categories
 */
export function useCategories(): UseCategoriesHook {
  const [state, setState] = useState<CategoriesState>({
    expense: FALLBACK_EXPENSE_CATEGORIES,
    income: FALLBACK_INCOME_CATEGORIES,
    source: "fallback",
    isLoading: true,
    error: null,
  });

  const fetchCategories = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch("/api/finance/categories");

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();

      setState({
        expense: data.expense || FALLBACK_EXPENSE_CATEGORIES,
        income: data.income || FALLBACK_INCOME_CATEGORIES,
        source: data.source || "fallback",
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Keep using fallback categories on error
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getCategoryLabel = useCallback(
    (id: string, type?: "expense" | "income" | "savings"): string => {
      // Normalize the id to lowercase for comparison
      const normalizedId = id.toLowerCase();

      // Search in the specified type first, then in all categories
      if (type === "expense" || !type) {
        const expenseCategory = state.expense.find(
          (c) => c.id.toLowerCase() === normalizedId || c.name.toLowerCase() === normalizedId
        );
        if (expenseCategory) return expenseCategory.name;
      }

      if (type === "income" || !type) {
        const incomeCategory = state.income.find(
          (c) => c.id.toLowerCase() === normalizedId || c.name.toLowerCase() === normalizedId
        );
        if (incomeCategory) return incomeCategory.name;
      }

      if (type === "savings" || !type) {
        const savingsCategory = SAVINGS_GOAL_CATEGORIES.find(
          (c) => c.id.toLowerCase() === normalizedId || c.name.toLowerCase() === normalizedId
        );
        if (savingsCategory) return savingsCategory.name;
      }

      // Return the original id with first letter capitalized if not found
      return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " ");
    },
    [state.expense, state.income]
  );

  const getCategoryById = useCallback(
    (id: string): Category | undefined => {
      const normalizedId = id.toLowerCase();
      return (
        state.expense.find((c) => c.id.toLowerCase() === normalizedId) ||
        state.income.find((c) => c.id.toLowerCase() === normalizedId) ||
        SAVINGS_GOAL_CATEGORIES.find((c) => c.id.toLowerCase() === normalizedId)
      );
    },
    [state.expense, state.income]
  );

  return {
    expenseCategories: state.expense,
    incomeCategories: state.income,
    savingsCategories: SAVINGS_GOAL_CATEGORIES,
    allCategories: [...state.expense, ...state.income],
    source: state.source,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchCategories,
    getCategoryLabel,
    getCategoryById,
  };
}

// Export fallback categories for static usage where hook can't be used
export { FALLBACK_EXPENSE_CATEGORIES, FALLBACK_INCOME_CATEGORIES, SAVINGS_GOAL_CATEGORIES };
