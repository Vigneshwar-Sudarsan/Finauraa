import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * POST /api/finance/refresh-balances
 * Lightweight refresh - only updates account balances, skips transactions
 * Used for quick sync when data is 15-60 minutes stale
 * BOBF/PDPL: Requires active bank_access consent
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(
      supabase,
      user.id,
      "/api/finance/refresh-balances"
    );
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty response
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        message: "No banks connected",
        synced: false,
        noBanksConnected: true,
      });
    }

    // Get all active bank connections with accounts
    const { data: connections } = await supabase
      .from("bank_connections")
      .select(
        `
        id,
        bank_id,
        bank_name,
        bank_accounts (
          id,
          account_id
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        message: "No active connections",
        synced: false,
      });
    }

    const client = createTarabutClient();
    const tokenResponse = await client.getAccessToken(user.id);
    const accessToken = tokenResponse.accessToken;

    let accountsUpdated = 0;
    const errors: string[] = [];

    // Flatten all accounts from all connections
    const allAccounts = connections.flatMap((conn) =>
      (conn.bank_accounts || []).map((acc) => ({
        ...acc,
        connectionId: conn.id,
        bankName: conn.bank_name,
      }))
    );

    // Update balances for each account
    for (const account of allAccounts) {
      try {
        const balanceResponse = await client.getAccountBalance(
          accessToken,
          account.account_id
        );
        const balances = balanceResponse.balances || [];
        const currentBalance =
          balances.find((b) => b.type === "Current") || balances[0];

        if (currentBalance) {
          await supabase
            .from("bank_accounts")
            .update({
              balance: currentBalance.amount.value,
              available_balance: currentBalance.amount.value,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          accountsUpdated++;
        }
      } catch (balanceError) {
        console.error(
          `Balance fetch error for ${account.account_id}:`,
          balanceError
        );
        errors.push(`${account.bankName}: Failed to fetch balance`);
      }
    }

    // Update connection tokens
    for (const connection of connections) {
      await supabase
        .from("bank_connections")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(
            Date.now() + tokenResponse.expiresIn * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    return NextResponse.json({
      message: "Balance refresh completed",
      accountsUpdated,
      errors: errors.length > 0 ? errors : undefined,
      synced: true,
      syncType: "balance-only",
    });
  } catch (error) {
    console.error("Balance refresh error:", error);
    return NextResponse.json(
      { error: "Balance refresh failed" },
      { status: 500 }
    );
  }
}
