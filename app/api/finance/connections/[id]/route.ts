import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";

/**
 * GET /api/finance/connections/[id]
 * Get details of a specific connection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from("bank_connections")
      .select(`
        *,
        bank_accounts (*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error) {
    console.error("Connection fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
}

/**
 * DELETE /api/finance/connections/[id]
 * Revokes consent and disconnects a bank, removes all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the connection belongs to this user
    const { data: connection, error: fetchError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Try to revoke consent via Tarabut API
    if (connection.consent_id) {
      try {
        const client = createTarabutClient();
        const tokenResponse = await client.getAccessToken(user.id);
        await client.revokeConsent(tokenResponse.accessToken, connection.consent_id);
      } catch (revokeError) {
        // Log but continue with local cleanup
        console.error("Failed to revoke consent via Tarabut:", revokeError);
      }
    }

    // Get all accounts for this connection to delete their transactions
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("connection_id", id);

    const accountIds = (accounts || []).map((a) => a.id);

    // Delete transactions for these accounts
    if (accountIds.length > 0) {
      await supabase
        .from("transactions")
        .delete()
        .in("account_id", accountIds);
    }

    // Delete accounts
    await supabase
      .from("bank_accounts")
      .delete()
      .eq("connection_id", id);

    // Delete the connection
    const { error: deleteError } = await supabase
      .from("bank_connections")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Failed to delete connection:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, revoked: true });
  } catch (error) {
    console.error("Connection delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
