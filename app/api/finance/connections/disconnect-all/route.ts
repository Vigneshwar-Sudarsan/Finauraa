import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/finance/connections/disconnect-all
 * Removes all bank connections for the current user (for testing/debugging)
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

    // Delete all transactions for this user
    await supabase.from("transactions").delete().eq("user_id", user.id);

    // Delete all bank accounts for this user
    await supabase.from("bank_accounts").delete().eq("user_id", user.id);

    // Delete all bank connections for this user
    await supabase.from("bank_connections").delete().eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "All bank connections disconnected",
    });
  } catch (error) {
    console.error("Disconnect all error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect banks" },
      { status: 500 }
    );
  }
}
