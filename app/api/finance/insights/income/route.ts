import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient, type TarabutRegion } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";
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

    // Get user's country to filter by region
    const { data: profile } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .single();

    const userRegion = (profile?.country || "BH") as TarabutRegion;

    // Check if user has bank connections for current region
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, region, access_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("region", userRegion)
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        totalIncome: 0,
        currency: userRegion === "SA" ? "SAR" : "BHD",
        sources: [],
        noBanksConnected: true,
      });
    }

    // Get valid token (refreshes if needed)
    const connection = connections[0];
    const tokenResult = await tokenManager.getValidToken(user.id, {
      access_token: connection.access_token,
      token_expires_at: connection.token_expires_at,
    });

    // Update database if token was refreshed
    if (tokenResult.shouldUpdate) {
      await supabase
        .from("bank_connections")
        .update({
          access_token: tokenResult.accessToken,
          token_expires_at: tokenResult.expiresAt.toISOString(),
        })
        .eq("id", connection.id);
    }

    // Fetch income summary from Tarabut
    const tarabut = createTarabutClient(userRegion);
    const incomeSummary = await tarabut.getIncomeSummary(tokenResult.accessToken);

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

      // Get user's region for filtering
      const { data: fbProfile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", user.id)
        .single();
      const fbRegion = fbProfile?.country || "BH";

      // Get region-filtered account IDs
      const { data: fbConnections } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("region", fbRegion);
      const fbConnectionIds = fbConnections?.map(c => c.id) || [];

      const { data: fbAccounts } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("user_id", user.id)
        .in("connection_id", fbConnectionIds);
      const fbAccountIds = fbAccounts?.map(a => a.id) || [];

      // Get income from local transactions (last 30 days) - region-filtered
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category, currency, description")
        .eq("user_id", user.id)
        .in("account_id", fbAccountIds.length > 0 ? fbAccountIds : ["__none__"])
        .eq("transaction_type", "credit")
        .gte("transaction_date", startDate.toISOString());

      if (!transactions || transactions.length === 0) {
        return NextResponse.json({
          totalIncome: 0,
          currency: fbRegion === "SA" ? "SAR" : "BHD",
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
        currency: transactions[0]?.currency || (fbRegion === "SA" ? "SAR" : "BHD"),
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
