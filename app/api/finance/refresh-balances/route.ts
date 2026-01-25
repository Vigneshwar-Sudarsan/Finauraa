import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";
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
        access_token,
        token_expires_at,
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

    let accountsUpdated = 0;
    const errors: string[] = [];

    // Process each connection with its own token validation
    for (const connection of connections) {
      try {
        // Get valid token (refreshes if needed)
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
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
        }

        const accessToken = tokenResult.accessToken;

        // Update balances for this connection's accounts
        for (const account of connection.bank_accounts || []) {
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
            errors.push(`${connection.bank_name}: Failed to fetch balance`);
          }
        }
      } catch (connectionError) {
        console.error(`Error processing connection ${connection.id}:`, connectionError);
        errors.push(`${connection.bank_name}: Failed to refresh token`);
      }
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
