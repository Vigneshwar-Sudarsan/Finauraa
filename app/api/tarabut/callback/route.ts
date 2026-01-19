import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";

/**
 * GET /api/tarabut/callback
 * Handles callback from Tarabut Connect after user completes consent
 *
 * Tarabut redirects with query params indicating success/failure
 * On success, we fetch accounts and transactions using the user's token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle error from Tarabut
    if (error) {
      console.error("Tarabut authorization error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?bank_error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Verify user session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=Session expired", request.url)
      );
    }

    // Get the pending bank connection for this user
    const { data: pendingConnection } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!pendingConnection) {
      console.error("No pending connection found for user:", user.id);
      return NextResponse.redirect(
        new URL("/?bank_error=No pending connection found", request.url)
      );
    }

    // Create client and get token for this user
    const client = createTarabutClient();
    const tokenResponse = await client.getAccessToken(user.id);

    // Fetch accounts from Tarabut - this includes provider info
    const accountsResponse = await client.getAccounts(tokenResponse.accessToken);
    console.log("Fetched accounts:", accountsResponse.accounts?.length || 0);

    if (!accountsResponse.accounts || accountsResponse.accounts.length === 0) {
      // No accounts returned - user may have cancelled or no accounts available
      await supabase
        .from("bank_connections")
        .delete()
        .eq("id", pendingConnection.id);

      return NextResponse.redirect(
        new URL("/?bank_error=No accounts found. Please try again.", request.url)
      );
    }

    // Get bank info from the first account's provider
    const firstAccount = accountsResponse.accounts[0];
    const bankId = firstAccount.providerId || "unknown";
    const bankName = firstAccount.providerName || bankId;

    // Update connection with actual bank info and access token
    await supabase
      .from("bank_connections")
      .update({
        bank_id: bankId,
        bank_name: bankName,
        access_token: tokenResponse.accessToken,
        token_expires_at: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
        status: "active",
      })
      .eq("id", pendingConnection.id);

    // Process each account
    for (const account of accountsResponse.accounts) {
      // Get balance for this account
      let balance = 0;
      try {
        const balanceResponse = await client.getAccountBalance(
          tokenResponse.accessToken,
          account.accountId
        );
        balance = balanceResponse.balances?.[0]?.amount?.value || 0;
      } catch (e) {
        console.error("Failed to get balance for account:", account.accountId, e);
      }

      // Mask account number for display
      const maskedNumber = account.identification
        ? "••••" + account.identification.slice(-4)
        : "••••0000";

      // Insert/update account in database
      const { data: bankAccount } = await supabase
        .from("bank_accounts")
        .upsert(
          {
            user_id: user.id,
            connection_id: pendingConnection.id,
            account_id: account.accountId,
            account_type: account.accountSubType || account.accountType,
            account_number: maskedNumber,
            currency: account.currency,
            balance: balance,
            available_balance: balance,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "connection_id,account_id" }
        )
        .select()
        .single();

      // Fetch transactions for this account
      if (bankAccount) {
        try {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const transactionsResponse = await client.getTransactions(
            tokenResponse.accessToken,
            account.accountId,
            ninetyDaysAgo
          );

          console.log("Fetched transactions:", transactionsResponse.transactions?.length || 0);

          const transactionsToInsert = (transactionsResponse.transactions || []).map((t) => ({
            user_id: user.id,
            account_id: bankAccount.id,
            transaction_id: t.transactionId,
            amount: Math.abs(t.amount.value),
            currency: t.amount.currency,
            transaction_type: t.creditDebitIndicator === "Credit" ? "credit" : "debit",
            description: t.transactionDescription || "",
            merchant_name: t.merchantDetails?.name || null,
            category: t.category?.name?.toLowerCase() || "other",
            transaction_date: t.bookingDateTime,
            booking_date: t.bookingDateTime,
          }));

          // Insert transactions in batches
          const batchSize = 50;
          for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
            const batch = transactionsToInsert.slice(i, i + batchSize);
            await supabase.from("transactions").upsert(batch, {
              onConflict: "account_id,transaction_id",
            });
          }
        } catch (e) {
          console.error("Failed to fetch transactions:", e);
        }
      }
    }

    return NextResponse.redirect(new URL("/?bank_connected=true", request.url));
  } catch (error) {
    console.error("Callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.redirect(
      new URL(`/?bank_error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
