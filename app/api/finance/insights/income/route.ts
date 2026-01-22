import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * GET /api/finance/insights/income
 * Fetches income insights from Tarabut Insights API
 * BOBF/PDPL: Requires active bank_access consent
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

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/insights/income");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        totalIncome: 0,
        currency: "BHD",
        sources: [],
        noBanksConnected: true,
      });
    }

    // Check if user has bank connections (fallback check)
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        totalIncome: 0,
        currency: "BHD",
        sources: [],
        noBanksConnected: true,
      });
    }

    // Get access token for user
    const tarabut = createTarabutClient();
    const tokenResponse = await tarabut.getAccessToken(user.id);

    // Fetch income summary from Tarabut
    const incomeSummary = await tarabut.getIncomeSummary(tokenResponse.accessToken);

    return NextResponse.json({
      totalIncome: incomeSummary.totalIncome,
      currency: incomeSummary.currency,
      period: incomeSummary.period,
      sources: incomeSummary.sources.map((source) => ({
        type: source.type,
        amount: source.amount,
        count: source.count,
        percentage: Math.round((source.amount / incomeSummary.totalIncome) * 100),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch income insights:", error);

    // Fallback to local data
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get income from local transactions (last 30 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category, currency, description")
        .eq("user_id", user.id)
        .eq("transaction_type", "credit")
        .gte("transaction_date", startDate.toISOString());

      if (!transactions || transactions.length === 0) {
        return NextResponse.json({
          totalIncome: 0,
          currency: "BHD",
          sources: [],
          fallback: true,
        });
      }

      const totalIncome = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Simple categorization based on amount patterns
      const sources: { type: string; amount: number; count: number }[] = [];
      const salaryTransactions = transactions.filter((t) => Math.abs(t.amount) > 500);
      const otherIncome = transactions.filter((t) => Math.abs(t.amount) <= 500);

      if (salaryTransactions.length > 0) {
        sources.push({
          type: "Salary",
          amount: salaryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
          count: salaryTransactions.length,
        });
      }

      if (otherIncome.length > 0) {
        sources.push({
          type: "Other",
          amount: otherIncome.reduce((sum, t) => sum + Math.abs(t.amount), 0),
          count: otherIncome.length,
        });
      }

      return NextResponse.json({
        totalIncome,
        currency: transactions[0]?.currency || "BHD",
        sources: sources.map((s) => ({
          ...s,
          percentage: Math.round((s.amount / totalIncome) * 100),
        })),
        fallback: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch income insights" },
        { status: 500 }
      );
    }
  }
}
