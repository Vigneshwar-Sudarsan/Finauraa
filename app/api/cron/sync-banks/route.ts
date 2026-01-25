import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";
import { SYNC_CONFIG } from "@/lib/sync-config";

/**
 * GET /api/cron/sync-banks
 * Scheduled cron job to sync all users' bank data
 * Runs every 6 hours via Vercel Cron
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const client = createTarabutClient();

    // Calculate cutoff time - skip users synced in last 4 hours
    const cutoffTime = new Date(
      Date.now() - SYNC_CONFIG.CRON_SKIP_IF_SYNCED_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Get all users with active bank connections that need syncing
    // We check if ANY of their accounts haven't been synced recently
    const { data: connectionsToSync, error: fetchError } = await supabase
      .from("bank_connections")
      .select(
        `
        id,
        user_id,
        bank_id,
        bank_name,
        access_token,
        token_expires_at,
        bank_accounts (
          id,
          account_id,
          last_synced_at
        )
      `
      )
      .eq("status", "active")
      .is("deleted_at", null);

    if (fetchError) {
      console.error("Failed to fetch connections:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 }
      );
    }

    // Filter to connections that need syncing (have stale accounts)
    const staleConnections = (connectionsToSync || []).filter((conn) => {
      const accounts = conn.bank_accounts || [];
      if (accounts.length === 0) return false;

      // Check if any account is stale (not synced in last 4 hours)
      return accounts.some((acc) => {
        if (!acc.last_synced_at) return true;
        return new Date(acc.last_synced_at) < new Date(cutoffTime);
      });
    });

    // Group connections by user_id
    const userConnections = new Map<
      string,
      Array<(typeof staleConnections)[0]>
    >();
    for (const conn of staleConnections) {
      const existing = userConnections.get(conn.user_id) || [];
      existing.push(conn);
      userConnections.set(conn.user_id, existing);
    }

    const results = {
      usersProcessed: 0,
      accountsUpdated: 0,
      transactionsAdded: 0,
      errors: [] as string[],
      skipped: connectionsToSync
        ? connectionsToSync.length - staleConnections.length
        : 0,
    };

    // Process users in batches with rate limiting
    const userIds = Array.from(userConnections.keys());
    const batchSize = SYNC_CONFIG.CRON_BATCH_SIZE;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (userId) => {
          try {
            const connections = userConnections.get(userId) || [];
            const syncResult = await syncUserBanks(
              supabase,
              client,
              userId,
              connections
            );

            results.usersProcessed++;
            results.accountsUpdated += syncResult.accountsUpdated;
            results.transactionsAdded += syncResult.transactionsAdded;

            if (syncResult.errors.length > 0) {
              results.errors.push(...syncResult.errors);
            }
          } catch (error) {
            console.error(`Error syncing user ${userId}:`, error);
            results.errors.push(`User ${userId}: Sync failed`);
          }
        })
      );

      // Rate limiting - wait between batches
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, 60000 / SYNC_CONFIG.CRON_RATE_LIMIT_PER_MINUTE)
        );
      }
    }

    console.log("Cron sync completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 });
  }
}

/**
 * Sync a single user's bank connections
 */
async function syncUserBanks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: ReturnType<typeof createTarabutClient>,
  userId: string,
  connections: Array<{
    id: string;
    bank_id: string;
    bank_name: string;
    access_token: string;
    token_expires_at: string;
    bank_accounts: Array<{
      id: string;
      account_id: string;
      last_synced_at: string | null;
    }> | null;
  }>
) {
  const result = {
    accountsUpdated: 0,
    transactionsAdded: 0,
    errors: [] as string[],
  };

  for (const connection of connections) {
    try {
      // Get valid token (refreshes if needed)
      const tokenResult = await tokenManager.getValidToken(userId, {
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

      try {

        // Process each account
        for (const account of connection.bank_accounts || []) {
          try {
            // Update balance
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

              result.accountsUpdated++;
            }

            // Fetch transactions incrementally
            // Use last sync time or default to 7 days for incremental sync
            let fromDate: Date;
            if (account.last_synced_at) {
              fromDate = new Date(account.last_synced_at);
            } else {
              fromDate = new Date(
                Date.now() -
                  SYNC_CONFIG.INCREMENTAL_TRANSACTION_DAYS * 24 * 3600000
              );
            }

            const transactionsResponse = await client.getTransactions(
              accessToken,
              account.account_id,
              fromDate
            );

            if (
              transactionsResponse.transactions &&
              transactionsResponse.transactions.length > 0
            ) {
              const transactionsToInsert = transactionsResponse.transactions.map(
                (t) => ({
                  user_id: userId,
                  account_id: account.id,
                  transaction_id: t.transactionId,
                  provider_id: t.providerId || connection.bank_id,
                  amount: Math.abs(t.amount.value),
                  currency: t.amount.currency,
                  transaction_type:
                    t.creditDebitIndicator === "Credit" ? "credit" : "debit",
                  description: t.transactionDescription || "",
                  merchant_name: t.merchant?.name || null,
                  merchant_logo: t.merchant?.logo || null,
                  category:
                    t.category?.name?.toLowerCase() ||
                    categorizeTransaction(
                      t.transactionDescription,
                      t.merchant?.name
                    ),
                  category_group:
                    t.category?.group ||
                    (t.creditDebitIndicator === "Credit" ? "Income" : "Expense"),
                  category_icon: t.category?.icon || null,
                  transaction_date: t.bookingDateTime,
                  booking_date: t.bookingDateTime,
                })
              );

              const { data: inserted } = await supabase
                .from("transactions")
                .upsert(transactionsToInsert, {
                  onConflict: "account_id,transaction_id",
                  ignoreDuplicates: false,
                })
                .select();

              result.transactionsAdded += inserted?.length || 0;
            }
          } catch (accountError) {
            console.error(
              `Error syncing account ${account.account_id}:`,
              accountError
            );
            result.errors.push(
              `${connection.bank_name}/${account.account_id}: Sync failed`
            );
          }
        }
      } catch (connectionError) {
        console.error(
          `Error syncing connection ${connection.id}:`,
          connectionError
        );
        result.errors.push(`${connection.bank_name}: Connection sync failed`);
      }
    } catch (tokenError) {
      console.error(`Error getting token for connection ${connection.id}:`, tokenError);
      result.errors.push(`${connection.bank_name}: Token refresh failed`);
    }
  }

  return result;
}

function categorizeTransaction(description?: string, merchant?: string): string {
  const desc = (description || "").toLowerCase();
  const merch = (merchant || "").toLowerCase();

  const categories: Record<string, string[]> = {
    groceries: ["lulu", "carrefour", "geant", "supermarket", "grocery"],
    dining: ["restaurant", "cafe", "coffee", "mcdonald", "kfc", "pizza"],
    transport: ["uber", "careem", "taxi", "petrol", "fuel", "parking"],
    bills: ["ewa", "electricity", "water", "batelco", "zain", "insurance"],
    shopping: ["amazon", "noon", "mall", "store", "shop"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((k) => desc.includes(k) || merch.includes(k))) {
      return category;
    }
  }

  return "other";
}
