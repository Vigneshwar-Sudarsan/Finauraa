import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { logConsentEvent, logBankEvent } from "@/lib/audit";

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

    // Log ALL callback parameters to see what Tarabut sends
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log("Tarabut callback - ALL params:", JSON.stringify(allParams, null, 2));
    console.log("Tarabut callback received:", { status, tgIntentId, error });

    // Create supabase client early for all operations
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Handle error from Tarabut (status can be FAILED, SUCCESSFUL, etc. - case insensitive)
    const statusLower = status?.toLowerCase();
    if (error || statusLower === "failed") {
      console.error("Tarabut authorization error:", error, errorDescription, status);

      // Clean up any pending connection and consent
      if (user) {
        await supabase
          .from("bank_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("status", "pending");

        // Also clean up pending consent
        await supabase
          .from("user_consents")
          .delete()
          .eq("user_id", user.id)
          .eq("consent_type", "bank_access")
          .eq("consent_status", "pending");
      }

      return NextResponse.redirect(
        new URL(`/?bank_error=${encodeURIComponent(errorDescription || error || "Connection failed")}`, request.url)
      );
    }

    // Must have successful status to proceed
    if (statusLower !== "successful" && statusLower !== "success") {
      console.error("Unexpected Tarabut status:", status);

      // Clean up any pending connection and consent
      if (user) {
        await supabase
          .from("bank_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("status", "pending");

        // Also clean up pending consent
        await supabase
          .from("user_consents")
          .delete()
          .eq("user_id", user.id)
          .eq("consent_type", "bank_access")
          .eq("consent_status", "pending");
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

    // Log each account's details for debugging (including consents)
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
        consents: acc.consents,
      });
    });

    // Get the consent ID from the pending connection (the intentId we stored)
    const intentConsentId = pendingConnection.consent_id;
    console.log("Intent/Consent ID from pending connection:", intentConsentId);

    // Get user's consents to find the active consent for this connection
    let userConsents: { consents: Array<{ consentId?: string; providerId: string; status: string; accountIds?: string[] }> } = { consents: [] };
    try {
      userConsents = await client.getConsents(tokenResponse.accessToken);
      console.log("User consents:", JSON.stringify(userConsents.consents, null, 2));
    } catch (e) {
      console.error("Failed to get consents:", e);
    }

    // Find the active consent - prefer matching by intentId if available, otherwise most recent active
    const activeConsent = userConsents.consents?.find(c =>
      c.status === "ACTIVE" && (c.consentId === intentConsentId || !intentConsentId)
    ) || userConsents.consents?.find(c => c.status === "ACTIVE");

    const consentId = activeConsent?.consentId;
    const consentProviderId = activeConsent?.providerId;
    console.log("Active consent:", { consentId, consentProviderId });

    // Try to get consent details which may include accountIds
    let consentAccountIds: string[] = [];
    if (consentId) {
      try {
        const consentDetails = await client.getConsentDetails(tokenResponse.accessToken, consentId);
        console.log("Consent details:", JSON.stringify(consentDetails, null, 2));
        if (consentDetails.accountIds && consentDetails.accountIds.length > 0) {
          consentAccountIds = consentDetails.accountIds;
          console.log("Consent account IDs:", consentAccountIds);
        }
      } catch (e) {
        console.error("Failed to get consent details:", e);
      }
    }

    // Filter accounts using multiple strategies (in order of accuracy):
    // 1. By accountIds from consent details (most accurate)
    // 2. By most recent consent in account's consents array (Tarabut uses "id" not "consentId")
    // 3. By provider ID (fallback)
    let filteredAccounts = accountsResponse.accounts || [];

    if (consentAccountIds.length > 0) {
      // Strategy 1: Filter by account IDs from consent details
      filteredAccounts = filteredAccounts.filter(acc => consentAccountIds.includes(acc.accountId));
      console.log("Filtered by consent accountIds:", filteredAccounts.length);
    } else {
      // Strategy 2: Find the most recent consent across all accounts and filter by it
      // Tarabut returns consents with "id" field (not "consentId") and "expiryDate"
      // The most recent consent will have the latest expiry date
      type AccountConsent = { id?: string; consentId?: string; expiryDate?: string; status: string };

      let mostRecentConsent: { id: string; expiryDate: string } | null = null;

      for (const acc of filteredAccounts) {
        const accConsents = acc.consents as AccountConsent[] | undefined;
        if (accConsents) {
          for (const consent of accConsents) {
            const cId = consent.id || consent.consentId;
            if (cId && consent.status === "ACTIVE" && consent.expiryDate) {
              if (!mostRecentConsent || consent.expiryDate > mostRecentConsent.expiryDate) {
                mostRecentConsent = { id: cId, expiryDate: consent.expiryDate };
              }
            }
          }
        }
      }

      console.log("Most recent consent found:", mostRecentConsent);

      if (mostRecentConsent) {
        // Filter accounts that have this most recent consent
        const accountsByConsent = filteredAccounts.filter(acc => {
          const accConsents = acc.consents as AccountConsent[] | undefined;
          return accConsents?.some(c =>
            (c.id === mostRecentConsent!.id || c.consentId === mostRecentConsent!.id) &&
            c.status === "ACTIVE"
          );
        });

        if (accountsByConsent.length > 0) {
          filteredAccounts = accountsByConsent;
          console.log("Filtered by most recent consent ID:", filteredAccounts.length);
        } else if (consentProviderId) {
          // Strategy 3: Fallback to provider ID
          filteredAccounts = filteredAccounts.filter(acc => acc.providerId === consentProviderId);
          console.log("Filtered by provider ID (fallback):", filteredAccounts.length);
        }
      } else if (consentProviderId) {
        // No consent found, filter by provider
        filteredAccounts = filteredAccounts.filter(acc => acc.providerId === consentProviderId);
        console.log("Filtered by provider ID:", filteredAccounts.length);
      }
    }

    console.log("Filtered accounts count:", filteredAccounts.length);

    if (!filteredAccounts || filteredAccounts.length === 0) {
      // No accounts returned - user may have cancelled or no accounts available
      await supabase
        .from("bank_connections")
        .delete()
        .eq("id", pendingConnection.id);

      // Also clean up pending consent
      await supabase
        .from("user_consents")
        .delete()
        .eq("user_id", user.id)
        .eq("consent_type", "bank_access")
        .eq("consent_status", "pending");

      return NextResponse.redirect(
        new URL("/?bank_error=No accounts found. Please try again.", request.url)
      );
    }

    // Get bank info from the first account's provider
    const firstAccount = filteredAccounts[0];
    const bankId = firstAccount.providerId || "unknown";
    const bankName = firstAccount.providerName || bankId;

    // Check if there's an existing active connection for this bank (same provider)
    // If so, we'll merge by updating the existing connection instead of creating a new one
    const { data: existingConnection } = await supabase
      .from("bank_connections")
      .select("id, consent_id")
      .eq("user_id", user.id)
      .eq("bank_id", bankId)
      .eq("status", "active")
      .neq("id", pendingConnection.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let connectionIdToUse = pendingConnection.id;

    if (existingConnection) {
      console.log("Found existing connection for same bank, merging:", existingConnection.id);

      // Delete old accounts and transactions for the existing connection
      const { data: oldAccounts } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("connection_id", existingConnection.id);

      if (oldAccounts && oldAccounts.length > 0) {
        const oldAccountIds = oldAccounts.map(a => a.id);
        await supabase
          .from("transactions")
          .delete()
          .in("account_id", oldAccountIds);
      }

      await supabase
        .from("bank_accounts")
        .delete()
        .eq("connection_id", existingConnection.id);

      // Revoke old consent via Tarabut if it exists
      if (existingConnection.consent_id) {
        try {
          await client.revokeConsent(tokenResponse.accessToken, existingConnection.consent_id);
        } catch (e) {
          console.error("Failed to revoke old consent:", e);
        }

        // Mark old consent as revoked in our database
        await supabase
          .from("user_consents")
          .update({
            consent_status: "revoked",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("tarabut_consent_id", existingConnection.consent_id);
      }

      // Update the existing connection with new consent info
      await supabase
        .from("bank_connections")
        .update({
          consent_id: pendingConnection.consent_id,
          access_token: tokenResponse.accessToken,
          token_expires_at: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
          consent_expires_at: pendingConnection.consent_expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);

      // Delete the pending connection since we're using the existing one
      await supabase
        .from("bank_connections")
        .delete()
        .eq("id", pendingConnection.id);

      connectionIdToUse = existingConnection.id;
      console.log("Merged into existing connection:", connectionIdToUse);
    } else {
      // No existing connection, update the pending connection as usual
      await supabase
        .from("bank_connections")
        .update({
          bank_id: bankId,
          bank_name: bankName,
          access_token: tokenResponse.accessToken,
          token_expires_at: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
          status: "active",
        })
        .eq("id", connectionIdToUse);
    }

    // BOBF/PDPL: Update consent record to active status
    // First, find the pending consent
    const { data: pendingConsent } = await supabase
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", "bank_access")
      .eq("consent_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let updatedConsent = null;
    let consentUpdateError = null;

    if (pendingConsent) {
      // Update the specific consent by ID
      const result = await supabase
        .from("user_consents")
        .update({
          consent_status: "active",
          provider_id: bankId,
          provider_name: bankName,
          tarabut_authorization_id: activeConsent?.providerId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pendingConsent.id)
        .select()
        .single();

      updatedConsent = result.data;
      consentUpdateError = result.error;
    } else {
      console.error("No pending consent found to update");
    }

    if (consentUpdateError) {
      console.error("Failed to update consent status:", consentUpdateError);
    } else if (updatedConsent) {
      // Log consent activation
      await logConsentEvent(user.id, "consent_given", updatedConsent.id, {
        consent_type: "bank_access",
        provider_id: bankId,
        provider_name: bankName,
      });
    }

    // Log bank connection event
    await logBankEvent(user.id, "bank_connected", connectionIdToUse, {
      bank_id: bankId,
      bank_name: bankName,
      accounts_count: filteredAccounts.length,
    });

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
        connection_id: connectionIdToUse,
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
