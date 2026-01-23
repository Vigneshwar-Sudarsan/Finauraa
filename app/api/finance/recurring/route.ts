import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFinanceManagerContext,
} from "@/lib/ai/finance-manager";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the full finance manager context which includes recurring expenses
    const context = await getFinanceManagerContext(user.id);

    if (!context) {
      return NextResponse.json(
        { error: "Failed to fetch recurring expenses" },
        { status: 500 }
      );
    }

    // Calculate monthly total
    const monthlyTotal = context.recurringExpenses.reduce((sum, exp) => {
      if (exp.frequency === "weekly") return sum + exp.amount * 4;
      if (exp.frequency === "yearly") return sum + exp.amount / 12;
      return sum + exp.amount;
    }, 0);

    // Return recurring expenses data
    return NextResponse.json({
      expenses: context.recurringExpenses.map((exp, index) => ({
        id: `recurring-${index}`,
        name: exp.name,
        amount: exp.amount,
        frequency: exp.frequency,
        nextDate: exp.nextDate,
        category: "subscriptions",
      })),
      monthlyTotal: Math.round(monthlyTotal * 1000) / 1000,
      currency: context.currency,
    });
  } catch (error) {
    console.error("Recurring expenses API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring expenses" },
      { status: 500 }
    );
  }
}
