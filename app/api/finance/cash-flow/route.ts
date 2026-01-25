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

    // Get the full finance manager context which includes cash flow data
    const context = await getFinanceManagerContext(user.id);

    if (!context) {
      return NextResponse.json(
        { error: "Failed to fetch cash flow data" },
        { status: 500 }
      );
    }

    // Return cash flow data
    return NextResponse.json({
      monthlyIncome: context.monthlyIncome,
      monthlyExpenses: context.monthlyExpenses,
      netCashFlow: context.netCashFlow,
      savingsRate: context.savingsRate,
      nextWeekProjection: context.cashFlowPrediction.nextWeekProjection,
      nextMonthProjection: context.cashFlowPrediction.nextMonthProjection,
      billsDue: context.cashFlowPrediction.billsDue,
      lowBalanceWarning: context.cashFlowPrediction.lowBalanceWarning,
      projectedLowDate: context.cashFlowPrediction.projectedLowDate,
      currency: context.currency,
    });
  } catch (error) {
    console.error("Cash flow API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow" },
      { status: 500 }
    );
  }
}
