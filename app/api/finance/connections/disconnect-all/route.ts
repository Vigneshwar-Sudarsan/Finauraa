import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient, type TarabutRegion } from "@/lib/tarabut/client";
import { logBankEvent } from "@/lib/audit";

/**
 * DELETE /api/finance/connections/disconnect-all
 * Removes all bank connections for the current user's active region
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

    // Get user's region
    const { data: profile } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .single();
    const userRegion = profile?.country || "BH";

    // Get region-filtered connections before deleting
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, bank_name, bank_id, consent_id, region")
      .eq("user_id", user.id)
      .eq("region", userRegion);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bank connections to disconnect",
        disconnectedCount: 0,
      });
    }

    const connectionIds = connections.map(c => c.id);

    // Revoke all consents via Tarabut API (using region-specific client)
    const consentIds = connections
      .map(c => c.consent_id)
      .filter((id): id is string => !!id);

    if (consentIds.length > 0) {
      try {
        const region = userRegion as TarabutRegion;
        const client = createTarabutClient(region);
        const tokenResponse = await client.getAccessToken(user.id);

        await Promise.allSettled(
          consentIds.map(consentId =>
            client.revokeConsent(tokenResponse.accessToken, consentId)
          )
        );
      } catch (revokeError) {
        console.error("Failed to revoke consents via Tarabut:", revokeError);
      }
    }

    // Get accounts for these connections
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("id")
      .in("connection_id", connectionIds);
    const accountIds = (accounts || []).map(a => a.id);

    // Delete transactions for these accounts
    if (accountIds.length > 0) {
      await supabase.from("transactions").delete().in("account_id", accountIds);
    }

    // Delete accounts for these connections
    await supabase.from("bank_accounts").delete().in("connection_id", connectionIds);

    // Delete the connections
    await supabase.from("bank_connections").delete().in("id", connectionIds);

    // Mark associated bank_access consents as revoked
    if (consentIds.length > 0) {
      await supabase
        .from("user_consents")
        .update({
          consent_status: "revoked",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("consent_type", "bank_access")
        .eq("consent_status", "active");
    }

    // Log all disconnections
    for (const conn of connections) {
      await logBankEvent(user.id, "bank_disconnected", conn.id, {
        bank_name: conn.bank_name,
        bank_id: conn.bank_id,
        bulk_disconnect: true,
        region: userRegion,
      });
    }

    return NextResponse.json({
      success: true,
      message: `All ${userRegion} bank connections disconnected`,
      disconnectedCount: connections.length,
    });
  } catch (error) {
    console.error("Disconnect all error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect banks" },
      { status: 500 }
    );
  }
}
