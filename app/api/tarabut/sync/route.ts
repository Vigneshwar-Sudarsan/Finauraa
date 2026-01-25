import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { tokenManager } from "@/lib/tarabut/token-manager";

/**
 * POST /api/tarabut/sync
 * Syncs latest transactions from connected bank accounts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    // Get bank connection
    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", connectionId)
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Get valid token (refreshes if needed)
    const client = createTarabutClient();
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
        .eq("id", connectionId);
    }

    const accessToken = tokenResult.accessToken;

    // Get all accounts for this connection
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("connection_id", connectionId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No accounts found" }, { status: 404 });
    }

    let totalNewTransactions = 0;

    for (const account of accounts) {
      try {
        // Get latest transaction date for this account
        const { data: latestTxn } = await supabase
          .from("transactions")
          .select("transaction_date")
          .eq("account_id", account.id)
          .order("transaction_date", { ascending: false })
          .limit(1)
          .single();

        const fromDate = latestTxn
          ? new Date(latestTxn.transaction_date)
          : new Date(Date.now() - 90 * 24 * 3600000);

        // Fetch new transactions
        const transactionsResponse = await client.getTransactions(
          accessToken,
          account.account_id,
          fromDate
        );

        if (transactionsResponse.transactions && transactionsResponse.transactions.length > 0) {
          const transactionsToInsert = transactionsResponse.transactions.map((t) => ({
            user_id: user.id,
            account_id: account.id,
            transaction_id: t.transactionId,
            provider_id: t.providerId || connection.provider_id,
            amount: Math.abs(t.amount.value),
            currency: t.amount.currency,
            transaction_type: t.creditDebitIndicator === "Credit" ? "credit" : "debit",
            description: t.transactionDescription || "",
            merchant_name: t.merchant?.name || null,
            merchant_logo: t.merchant?.logo || null,
            category: t.category?.name?.toLowerCase() || categorizeTransaction(t.transactionDescription, t.merchant?.name),
            category_group: t.category?.group || (t.creditDebitIndicator === "Credit" ? "Income" : "Expense"),
            category_icon: t.category?.icon || null,
            transaction_date: t.bookingDateTime,
            booking_date: t.bookingDateTime,
          }));

          const { data: inserted } = await supabase
            .from("transactions")
            .upsert(transactionsToInsert, { onConflict: "account_id,transaction_id" })
            .select();

          totalNewTransactions += inserted?.length || 0;
        }

        // Update balance
        try {
          const balanceResponse = await client.getAccountBalance(accessToken, account.account_id);
          const balance = balanceResponse.balances?.[0]?.amount?.value || 0;

          await supabase
            .from("bank_accounts")
            .update({
              balance: balance,
              available_balance: balance,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", account.id);
        } catch (balanceError) {
          console.error(`Error fetching balance for account ${account.id}:`, balanceError);
        }
      } catch (accountError) {
        console.error(`Error syncing account ${account.id}:`, accountError);
      }
    }

    return NextResponse.json({
      message: "Sync completed",
      newTransactions: totalNewTransactions,
      synced: true,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
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
