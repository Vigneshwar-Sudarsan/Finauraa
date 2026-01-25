import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Base fallback categories when user has no transactions
const BASE_EXPENSE_CATEGORIES = [
  { id: "shopping", name: "Shopping", parentId: null, icon: null },
  { id: "groceries", name: "Groceries", parentId: null, icon: null },
  { id: "food & dining", name: "Food & Dining", parentId: null, icon: null },
  { id: "transport", name: "Transport", parentId: null, icon: null },
  { id: "utilities", name: "Utilities", parentId: null, icon: null },
  { id: "entertainment", name: "Entertainment", parentId: null, icon: null },
  { id: "healthcare", name: "Healthcare", parentId: null, icon: null },
  { id: "travel", name: "Travel", parentId: null, icon: null },
  { id: "housing", name: "Housing", parentId: null, icon: null },
  { id: "subscriptions", name: "Subscriptions", parentId: null, icon: null },
  { id: "other", name: "Other", parentId: null, icon: null },
];

const BASE_INCOME_CATEGORIES = [
  { id: "salary & wages", name: "Salary & Wages", parentId: null, icon: null },
  { id: "freelance", name: "Freelance", parentId: null, icon: null },
  { id: "investments", name: "Investments", parentId: null, icon: null },
  { id: "rental income", name: "Rental Income", parentId: null, icon: null },
  { id: "retirement & pensions", name: "Retirement & Pensions", parentId: null, icon: null },
  { id: "other income", name: "Other Income", parentId: null, icon: null },
];

// Helper to format category name for display
function formatCategoryName(category: string): string {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * GET /api/finance/categories
 * Fetches unique transaction categories from user's transactions (Tarabut-enriched)
 * Falls back to base categories if no transactions exist
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch distinct categories from user's transactions
    // This gets the actual Tarabut-enriched categories
    const { data: expenseTransactions } = await supabase
      .from("transactions")
      .select("category, category_group, category_icon")
      .eq("user_id", user.id)
      .eq("transaction_type", "debit")
      .is("deleted_at", null)
      .not("category", "is", null);

    const { data: incomeTransactions } = await supabase
      .from("transactions")
      .select("category, category_group, category_icon")
      .eq("user_id", user.id)
      .eq("transaction_type", "credit")
      .is("deleted_at", null)
      .not("category", "is", null);

    // Extract unique expense categories from transactions
    const expenseSet = new Map<string, { id: string; name: string; parentId: null; icon: string | null }>();
    (expenseTransactions || []).forEach((t) => {
      if (t.category) {
        const id = t.category.toLowerCase();
        if (!expenseSet.has(id)) {
          expenseSet.set(id, {
            id,
            name: formatCategoryName(t.category),
            parentId: null,
            icon: t.category_icon || null,
          });
        }
      }
    });

    // Extract unique income categories from transactions
    const incomeSet = new Map<string, { id: string; name: string; parentId: null; icon: string | null }>();
    (incomeTransactions || []).forEach((t) => {
      if (t.category) {
        const id = t.category.toLowerCase();
        if (!incomeSet.has(id)) {
          incomeSet.set(id, {
            id,
            name: formatCategoryName(t.category),
            parentId: null,
            icon: t.category_icon || null,
          });
        }
      }
    });

    // Merge with base categories (base categories as fallback, transaction categories take priority)
    const expenseCategories = [...expenseSet.values()];
    const incomeCategories = [...incomeSet.values()];

    // Add base categories that aren't in the transaction set
    BASE_EXPENSE_CATEGORIES.forEach((baseCat) => {
      if (!expenseSet.has(baseCat.id)) {
        expenseCategories.push(baseCat);
      }
    });

    BASE_INCOME_CATEGORIES.forEach((baseCat) => {
      if (!incomeSet.has(baseCat.id)) {
        incomeCategories.push(baseCat);
      }
    });

    // Sort alphabetically
    expenseCategories.sort((a, b) => a.name.localeCompare(b.name));
    incomeCategories.sort((a, b) => a.name.localeCompare(b.name));

    const hasTransactionCategories = expenseSet.size > 0 || incomeSet.size > 0;

    return NextResponse.json({
      expense: expenseCategories,
      income: incomeCategories,
      source: hasTransactionCategories ? "transactions" : "fallback",
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
