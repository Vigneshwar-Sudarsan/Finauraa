import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/banks
 * Fetches all bank connections with their associated accounts
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

    // Fetch all bank connections for the user
    const { data: connections, error: connectionsError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (connectionsError) {
      console.error("Failed to fetch connections:", connectionsError);
      return NextResponse.json(
        { error: "Failed to fetch banks" },
        { status: 500 }
      );
    }

    // Fetch accounts for each connection
    const banksWithAccounts = await Promise.all(
      (connections || []).map(async (connection) => {
        const { data: accounts } = await supabase
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
            last_synced_at
          `
          )
          .eq("connection_id", connection.id)
          .order("balance", { ascending: false });

        return {
          id: connection.id,
          bank_id: connection.bank_id,
          bank_name: connection.bank_name,
          status: connection.status,
          created_at: connection.created_at,
          token_expires_at: connection.token_expires_at,
          accounts: accounts || [],
        };
      })
    );

    // Calculate totals
    const totalBalance = banksWithAccounts.reduce(
      (sum, bank) =>
        sum + bank.accounts.reduce((acc, a) => acc + (a.balance || 0), 0),
      0
    );

    const totalAccounts = banksWithAccounts.reduce(
      (sum, bank) => sum + bank.accounts.length,
      0
    );

    return NextResponse.json({
      banks: banksWithAccounts,
      totalBalance,
      totalAccounts,
      bankCount: banksWithAccounts.length,
    });
  } catch (error) {
    console.error("Banks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
