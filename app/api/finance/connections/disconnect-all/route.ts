import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
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

    // Get connections before deleting for audit logging and consent revocation
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, bank_name, bank_id, consent_id")
      .eq("user_id", user.id);

    // Revoke all consents via Tarabut API
    const consentIds = (connections || [])
      .map(c => c.consent_id)
      .filter((id): id is string => !!id);

    if (consentIds.length > 0) {
      try {
        const client = createTarabutClient();
        const tokenResponse = await client.getAccessToken(user.id);

        // Revoke each consent (in parallel for speed)
        await Promise.allSettled(
          consentIds.map(consentId =>
            client.revokeConsent(tokenResponse.accessToken, consentId)
          )
        );
      } catch (revokeError) {
        // Log but continue with local cleanup
        console.error("Failed to revoke consents via Tarabut:", revokeError);
      }
    }

    // Delete all transactions for this user
    await supabase.from("transactions").delete().eq("user_id", user.id);

    // Delete all bank accounts for this user
    await supabase.from("bank_accounts").delete().eq("user_id", user.id);

    // Delete all bank connections for this user
    await supabase.from("bank_connections").delete().eq("user_id", user.id);

    // Mark all bank_access consents as revoked
    await supabase
      .from("user_consents")
      .update({
        consent_status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("consent_type", "bank_access")
      .eq("consent_status", "active");

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
