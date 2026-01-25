import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent, logDataAccessSuccess } from "@/lib/consent-middleware";

/**
 * GET /api/finance/connections
 * Fetches all bank connections for the user
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
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/connections");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({ connections: [], noBanksConnected: true });
    }

    // Fetch connections with account counts in a single query using left join
    const { data: connections, error } = await supabase
      .from("bank_connections")
      .select(`
        id,
        bank_id,
        bank_name,
        status,
        created_at,
        token_expires_at,
        bank_accounts(id)
      `)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch connections:", error);
      return NextResponse.json(
        { error: "Failed to fetch connections" },
        { status: 500 }
      );
    }

    // Transform data to include account_count
    const connectionsWithCounts = (connections || []).map((connection) => ({
      id: connection.id,
      bank_id: connection.bank_id,
      bank_name: connection.bank_name,
      status: connection.status,
      created_at: connection.created_at,
      token_expires_at: connection.token_expires_at,
      account_count: connection.bank_accounts?.length || 0,
    }));

    return NextResponse.json({
      connections: connectionsWithCounts,
    });
  } catch (error) {
    console.error("Connections fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
