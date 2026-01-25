import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * GET /api/finance/insights/balance-history
 * Fetches balance history from Tarabut Insights API
 * BOBF/PDPL: Requires active bank_access consent
 * Query params:
 *   - accountId: specific account (optional, uses v2 endpoint if not provided)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/insights/balance-history");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        history: [],
        noBanksConnected: true,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    // Check if user has bank connections (fallback check)
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, access_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        history: [],
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

    const tarabut = createTarabutClient();

    if (accountId) {
      // Fetch balance history for specific account
      const history = await tarabut.getBalanceHistory(tokenResult.accessToken, accountId);

      return NextResponse.json({
        accountId: history.accountId,
        history: history.history.map((point) => ({
          date: point.date,
          balance: point.balance,
          currency: point.currency,
        })),
        period: history.period,
      });
    } else {
      // Fetch balance history for all accounts (V2)
      const historyV2 = await tarabut.getBalanceHistoryV2(tokenResult.accessToken);

      return NextResponse.json({
        accounts: historyV2.accounts.map((acc) => ({
          accountId: acc.accountId,
          history: acc.history.map((point) => ({
            date: point.date,
            balance: point.balance,
            currency: point.currency,
          })),
        })),
        aggregated: historyV2.aggregated?.map((point) => ({
          date: point.date,
          balance: point.balance,
          currency: point.currency,
        })),
        period: historyV2.period,
      });
    }
  } catch (error) {
    console.error("Failed to fetch balance history:", error);

    // Fallback: generate mock history from current balances
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get current account balances
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, balance, currency")
        .eq("user_id", user.id);

      if (!accounts || accounts.length === 0) {
        return NextResponse.json({
          history: [],
          fallback: true,
        });
      }

      // Generate mock history (last 30 days with slight variations)
      const history = [];
      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const currency = accounts[0]?.currency || "BHD";

      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Add some variation (±5%)
        const variation = 1 + (Math.random() - 0.5) * 0.1;
        history.push({
          date: date.toISOString().split("T")[0],
          balance: Math.round(totalBalance * variation * 100) / 100,
          currency,
        });
      }

      // Set last point to actual balance
      if (history.length > 0) {
        history[history.length - 1].balance = totalBalance;
      }

      return NextResponse.json({
        aggregated: history,
        period: {
          from: history[0]?.date,
          to: history[history.length - 1]?.date,
        },
        fallback: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch balance history" },
        { status: 500 }
      );
    }
  }
}
