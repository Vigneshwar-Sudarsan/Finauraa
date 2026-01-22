import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logBankEvent } from "@/lib/audit";

/**
 * DELETE /api/finance/connections/disconnect-all
 * Removes all bank connections for the current user
 * Note: Does not require consent check since this is a data deletion operation
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connections before deleting for audit logging
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, bank_name, bank_id")
      .eq("user_id", user.id);

    // Delete all transactions for this user
    await supabase.from("transactions").delete().eq("user_id", user.id);

    // Delete all bank accounts for this user
    await supabase.from("bank_accounts").delete().eq("user_id", user.id);

    // Delete all bank connections for this user
    await supabase.from("bank_connections").delete().eq("user_id", user.id);

    // Log all disconnections
    for (const conn of connections || []) {
      await logBankEvent(user.id, "bank_disconnected", conn.id, {
        bank_name: conn.bank_name,
        bank_id: conn.bank_id,
        bulk_disconnect: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "All bank connections disconnected",
      disconnectedCount: connections?.length || 0,
    });
  } catch (error) {
    console.error("Disconnect all error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect banks" },
      { status: 500 }
    );
  }
}
