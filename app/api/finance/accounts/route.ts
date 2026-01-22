import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent, logDataAccessSuccess } from "@/lib/consent-middleware";

/**
 * GET /api/finance/accounts
 * Fetches all bank accounts for the user with connection info
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
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/accounts");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // Fetch accounts with their bank connection info
    const { data: accounts, error } = await supabase
      .from("bank_accounts")
      .select(
        `
        id,
        account_id,
        account_type,
        account_number,
        currency,
        balance,
        available_balance,
        last_synced_at,
        connection_id,
        bank_connections (
          bank_name,
          bank_id,
          status
        )
      `
      )
      .eq("user_id", user.id)
      .order("balance", { ascending: false });

    if (error) {
      console.error("Failed to fetch accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }

    // Transform the data to flatten bank connection info
    const transformedAccounts = (accounts || []).map((account) => {
      // bank_connections can be an array or single object depending on relationship
      const connectionData = account.bank_connections;
      const connection = Array.isArray(connectionData)
        ? connectionData[0] as { bank_name: string; bank_id: string; status: string } | undefined
        : connectionData as { bank_name: string; bank_id: string; status: string } | null;

      return {
        id: account.id,
        account_id: account.account_id,
        account_type: account.account_type,
        account_number: account.account_number,
        currency: account.currency,
        balance: account.balance,
        available_balance: account.available_balance,
        last_synced_at: account.last_synced_at,
        connection_id: account.connection_id,
        bank_name: connection?.bank_name || "Unknown Bank",
        bank_id: connection?.bank_id,
        connection_status: connection?.status,
      };
    });

    // Calculate totals
    const totalBalance = transformedAccounts.reduce(
      (sum, acc) => sum + (acc.balance || 0),
      0
    );

    // Log successful data access
    await logDataAccessSuccess(user.id, "bank_account", consentCheck.consentId, "/api/finance/accounts", {
      accountCount: transformedAccounts.length,
    });

    return NextResponse.json({
      accounts: transformedAccounts,
      totalBalance,
      accountCount: transformedAccounts.length,
    });
  } catch (error) {
    console.error("Accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
