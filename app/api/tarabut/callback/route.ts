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
    const status = searchParams.get("status");
    const tgIntentId = searchParams.get("tgIntentId");

    console.log("Tarabut callback received:", { status, tgIntentId, error });

    // Create supabase client early for all operations
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Handle error from Tarabut (status can be FAILED, SUCCESSFUL, etc. - case insensitive)
    const statusLower = status?.toLowerCase();
    if (error || statusLower === "failed") {
      console.error("Tarabut authorization error:", error, errorDescription, status);

      // Clean up any pending connection
      if (user) {
        await supabase
          .from("bank_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("status", "pending");
      }

      return NextResponse.redirect(
        new URL(`/?bank_error=${encodeURIComponent(errorDescription || error || "Connection failed")}`, request.url)
      );
    }

    // Must have successful status to proceed
    if (statusLower !== "successful" && statusLower !== "success") {
      console.error("Unexpected Tarabut status:", status);

      // Clean up any pending connection
      if (user) {
        await supabase
          .from("bank_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("status", "pending");
      }

      return NextResponse.redirect(
        new URL(`/?bank_error=${encodeURIComponent("Connection was not completed")}`, request.url)
      );
    }

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

    // Log each account's details for debugging
    accountsResponse.accounts?.forEach((acc, i) => {
      console.log(`Account ${i + 1}:`, {
        accountId: acc.accountId,
        providerId: acc.providerId,
        providerName: acc.providerName,
        accountType: acc.accountType,
        accountSubType: acc.accountSubType,
        identification: acc.identification,
        name: acc.name,
        currency: acc.currency,
      });
    });

    // Get user's consents to filter accounts by the provider they just connected
    let userConsents: { consents: Array<{ providerId: string; status: string }> } = { consents: [] };
    try {
      userConsents = await client.getConsents(tokenResponse.accessToken);
      console.log("User consents:", JSON.stringify(userConsents.consents, null, 2));
    } catch (e) {
      console.error("Failed to get consents:", e);
    }

    // Get the most recent active consent's providerId
    const activeConsent = userConsents.consents?.find(c => c.status === "ACTIVE");
    const consentProviderId = activeConsent?.providerId;
    console.log("Active consent providerId:", consentProviderId);

    // Filter accounts to only those from the consented provider
    const filteredAccounts = consentProviderId
      ? accountsResponse.accounts?.filter(acc => acc.providerId === consentProviderId) || []
      : accountsResponse.accounts || [];

    console.log("Filtered accounts count:", filteredAccounts.length);

    if (!filteredAccounts || filteredAccounts.length === 0) {
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
    const firstAccount = filteredAccounts[0];
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

    // Process each account from the filtered list
    for (const account of filteredAccounts) {
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
      const accountData = {
        user_id: user.id,
        connection_id: pendingConnection.id,
        account_id: account.accountId,
        account_type: account.accountSubType || account.accountType || "Current",
        account_number: maskedNumber,
        currency: account.currency || "BHD",
        balance: balance,
        available_balance: balance,
        last_synced_at: new Date().toISOString(),
      };
      console.log("Inserting account:", accountData);

      const { data: bankAccount, error: accountError } = await supabase
        .from("bank_accounts")
        .upsert(accountData, { onConflict: "connection_id,account_id" })
        .select()
        .single();

      if (accountError) {
        console.error("Failed to insert account:", accountError);
      } else {
        console.log("Account inserted successfully:", bankAccount?.id);
      }

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
            provider_id: t.providerId || bankId,
            amount: Math.abs(t.amount.value),
            currency: t.amount.currency,
            transaction_type: t.creditDebitIndicator === "Credit" ? "credit" : "debit",
            description: t.transactionDescription || "",
            merchant_name: t.merchant?.name || null,
            merchant_logo: t.merchant?.logo || null,
            category: t.category?.name?.toLowerCase() || "other",
            category_group: t.category?.group || (t.creditDebitIndicator === "Credit" ? "Income" : "Expense"),
            category_icon: t.category?.icon || null,
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

    // Redirect immediately to the app with success flag
    return NextResponse.redirect(new URL("/?bank_connected=true", request.url));
  } catch (error) {
    console.error("Callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";

    // Redirect immediately to the app with error flag
    return NextResponse.redirect(
      new URL(`/?bank_error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
