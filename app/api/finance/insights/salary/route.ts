import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * GET /api/finance/insights/salary
 * Fetches salary detection from Tarabut Insights API
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
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/insights/salary");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        detected: false,
        message: "Connect your bank to detect salary information",
        noBanksConnected: true,
      });
    }

    // Check if user has bank connections (fallback check)
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, access_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        detected: false,
        message: "Connect your bank to detect salary information",
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

    // Try both salary endpoints
    const tarabut = createTarabutClient();
    let salaryInfo;
    try {
      salaryInfo = await tarabut.getSalaryCheck(tokenResult.accessToken);
    } catch {
      // Try alternative endpoint
      salaryInfo = await tarabut.getSalary(tokenResult.accessToken);
    }

    if (!salaryInfo.detected) {
      return NextResponse.json({
        detected: false,
        message: "No regular salary pattern detected",
      });
    }

    return NextResponse.json({
      detected: true,
      employer: salaryInfo.employer,
      amount: salaryInfo.amount,
      currency: salaryInfo.currency,
      frequency: salaryInfo.frequency,
      nextExpectedDate: salaryInfo.nextExpectedDate,
      lastPayDate: salaryInfo.lastPayDate,
      confidence: salaryInfo.confidence,
    });
  } catch (error) {
    console.error("Failed to fetch salary info:", error);

    // Fallback: try to detect salary from local transactions
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get credit transactions from last 90 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, currency, transaction_date, description")
        .eq("user_id", user.id)
        .eq("transaction_type", "credit")
        .gte("transaction_date", startDate.toISOString())
        .order("transaction_date", { ascending: false });

      if (!transactions || transactions.length < 2) {
        return NextResponse.json({
          detected: false,
          message: "Not enough transaction history",
          fallback: true,
        });
      }

      // Simple salary detection: look for similar amounts on regular intervals
      const largeCredits = transactions.filter((t) => Math.abs(t.amount) > 300);

      if (largeCredits.length >= 2) {
        // Check if amounts are similar (within 10%)
        const amounts = largeCredits.map((t) => Math.abs(t.amount));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const similarAmounts = amounts.filter(
          (a) => Math.abs(a - avgAmount) / avgAmount < 0.1
        );

        if (similarAmounts.length >= 2) {
          // Potential salary detected
          const lastPayDate = new Date(largeCredits[0].transaction_date);
          const nextExpected = new Date(lastPayDate);
          nextExpected.setMonth(nextExpected.getMonth() + 1);

          return NextResponse.json({
            detected: true,
            amount: avgAmount,
            currency: largeCredits[0].currency || "BHD",
            frequency: "MONTHLY",
            lastPayDate: lastPayDate.toISOString(),
            nextExpectedDate: nextExpected.toISOString(),
            confidence: 0.6,
            fallback: true,
          });
        }
      }

      return NextResponse.json({
        detected: false,
        message: "No regular salary pattern detected",
        fallback: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to detect salary" },
        { status: 500 }
      );
    }
  }
}
