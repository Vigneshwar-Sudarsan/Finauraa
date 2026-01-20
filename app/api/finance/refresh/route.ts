import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";

/**
 * POST /api/finance/refresh
 * Refreshes all bank connections - accounts and transactions
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

    // Get all active bank connections
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        message: "No active connections",
        synced: false
      });
    }

    const client = createTarabutClient();
    const tokenResponse = await client.getAccessToken(user.id);
    const accessToken = tokenResponse.accessToken;

    let totalNewTransactions = 0;
    let accountsUpdated = 0;
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        // Update connection token
        await supabase
          .from("bank_connections")
          .update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        // Fetch fresh accounts from Tarabut
        const accountsResponse = await client.getAccounts(accessToken);

        // Filter accounts for this provider
        const providerAccounts = accountsResponse.accounts.filter(
          (a) => a.providerId === connection.bank_id
        );

        for (const tarabutAccount of providerAccounts) {
          // Check if account exists
          const { data: existingAccount } = await supabase
            .from("bank_accounts")
            .select("id")
            .eq("account_id", tarabutAccount.accountId)
            .eq("connection_id", connection.id)
            .single();

          let accountId: string;

          if (existingAccount) {
            accountId = existingAccount.id;
          } else {
            // Insert new account
            const { data: newAccount } = await supabase
              .from("bank_accounts")
              .insert({
                user_id: user.id,
                connection_id: connection.id,
                account_id: tarabutAccount.accountId,
                account_type: tarabutAccount.accountType || "Current",
                account_number: tarabutAccount.identification || "****",
                currency: tarabutAccount.currency || "BHD",
              })
              .select()
              .single();

            if (!newAccount) continue;
            accountId = newAccount.id;
          }

          // Update balance
          try {
            const balanceResponse = await client.getAccountBalance(accessToken, tarabutAccount.accountId);
            const balances = balanceResponse.balances || [];
            const currentBalance = balances.find(b => b.type === "Current") || balances[0];

            if (currentBalance) {
              await supabase
                .from("bank_accounts")
                .update({
                  balance: currentBalance.amount.value,
                  available_balance: currentBalance.amount.value,
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", accountId);

              accountsUpdated++;
            }
          } catch (balanceError) {
            console.error(`Balance fetch error for ${tarabutAccount.accountId}:`, balanceError);
          }

          // Fetch transactions (last 90 days)
          try {
            const fromDate = new Date(Date.now() - 90 * 24 * 3600000);
            const transactionsResponse = await client.getTransactions(
              accessToken,
              tarabutAccount.accountId,
              fromDate
            );

            if (transactionsResponse.transactions && transactionsResponse.transactions.length > 0) {
              const transactionsToInsert = transactionsResponse.transactions.map((t) => ({
                user_id: user.id,
                account_id: accountId,
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
                .upsert(transactionsToInsert, {
                  onConflict: "account_id,transaction_id",
                  ignoreDuplicates: false
                })
                .select();

              totalNewTransactions += inserted?.length || 0;
            }
          } catch (txError) {
            console.error(`Transaction fetch error for ${tarabutAccount.accountId}:`, txError);
          }
        }
      } catch (connectionError) {
        console.error(`Error refreshing connection ${connection.id}:`, connectionError);
        errors.push(`${connection.bank_name}: Failed to refresh`);
      }
    }

    return NextResponse.json({
      message: "Refresh completed",
      accountsUpdated,
      newTransactions: totalNewTransactions,
      errors: errors.length > 0 ? errors : undefined,
      synced: true,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
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
