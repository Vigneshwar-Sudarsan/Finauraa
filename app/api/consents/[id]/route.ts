import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logConsentEvent, logAuditEvent } from "@/lib/audit";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/consents/:id
 * Get details of a specific consent
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: consent, error } = await supabase
      .from("user_consents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !consent) {
      return NextResponse.json({ error: "Consent not found" }, { status: 404 });
    }

    return NextResponse.json({ consent });
  } catch (error) {
    console.error("Consent GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/consents/:id
 * Revoke a consent - triggers data cleanup workflow
 * PDPL Requirement: Users can withdraw consent at any time
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the consent to verify ownership and type
    const { data: consent, error: fetchError } = await supabase
      .from("user_consents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !consent) {
      return NextResponse.json({ error: "Consent not found" }, { status: 404 });
    }

    if (consent.consent_status === "revoked") {
      return NextResponse.json(
        { error: "Consent already revoked" },
        { status: 400 }
      );
    }

    // Get revocation reason from body if provided
    let revocationReason = "User requested revocation";
    try {
      const body = await request.json();
      if (body.reason) {
        revocationReason = body.reason;
      }
    } catch {
      // No body provided, use default reason
    }

    // Get client IP for audit
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;

    // Revoke the consent
    const { data: revokedConsent, error: updateError } = await supabase
      .from("user_consents")
      .update({
        consent_status: "revoked",
        revoked_at: new Date().toISOString(),
        revocation_reason: revocationReason,
        revoked_by: "user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error revoking consent:", updateError);
      return NextResponse.json(
        { error: "Failed to revoke consent" },
        { status: 500 }
      );
    }

    // Log consent revocation
    await logConsentEvent(user.id, "consent_revoked", id, {
      consent_type: consent.consent_type,
      provider_id: consent.provider_id,
      reason: revocationReason,
    });

    // Trigger data cleanup based on consent type
    const cleanupResults = await triggerDataCleanup(
      supabase,
      user.id,
      consent,
      ipAddress
    );

    return NextResponse.json({
      message: "Consent revoked successfully",
      consent: revokedConsent,
      cleanup: cleanupResults,
    });
  } catch (error) {
    console.error("Consent DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Trigger data cleanup when consent is revoked
 * Implements the data deletion workflow per PDPL requirements
 */
async function triggerDataCleanup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  consent: {
    id: string;
    consent_type: string;
    provider_id: string | null;
  },
  ipAddress: string | null
) {
  const results: {
    accountsMarked: number;
    transactionsMarked: number;
    connectionsMarked: number;
    deletionRequestCreated: boolean;
  } = {
    accountsMarked: 0,
    transactionsMarked: 0,
    connectionsMarked: 0,
    deletionRequestCreated: false,
  };

  try {
    // For bank_access consent, mark related data for deletion
    if (consent.consent_type === "bank_access" && consent.provider_id) {
      // Get retention policy
      const { data: policy } = await supabase
        .from("data_retention_policies")
        .select("post_revocation_retention_days")
        .eq("data_type", "bank_accounts")
        .eq("is_active", true)
        .single();

      const retentionDays = policy?.post_revocation_retention_days || 30;
      const scheduledDeletion = new Date();
      scheduledDeletion.setDate(scheduledDeletion.getDate() + retentionDays);

      // Find bank connections for this provider
      const { data: connections } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("bank_id", consent.provider_id)
        .is("deleted_at", null);

      if (connections && connections.length > 0) {
        const connectionIds = connections.map((c) => c.id);

        // Soft delete bank connections
        const { data: connData } = await supabase
          .from("bank_connections")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: "consent_revoked",
            status: "revoked",
          })
          .in("id", connectionIds)
          .select("id");

        results.connectionsMarked = connData?.length || 0;

        // Soft delete associated bank accounts
        const { data: acctData } = await supabase
          .from("bank_accounts")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: "consent_revoked",
          })
          .in("connection_id", connectionIds)
          .select("id");

        results.accountsMarked = acctData?.length || 0;

        // Get account IDs for transaction cleanup
        const { data: accounts } = await supabase
          .from("bank_accounts")
          .select("id")
          .in("connection_id", connectionIds);

        if (accounts && accounts.length > 0) {
          const accountIds = accounts.map((a) => a.id);

          // Mark transactions for deletion
          const { data: txData } = await supabase
            .from("transactions")
            .update({
              deleted_at: new Date().toISOString(),
              deleted_by: "consent_revoked",
              retention_expires_at: scheduledDeletion.toISOString(),
            })
            .in("account_id", accountIds)
            .is("deleted_at", null)
            .select("id");

          results.transactionsMarked = txData?.length || 0;
        }
      }

      // Create deletion request for tracking
      const { error: delError } = await supabase
        .from("data_deletion_requests")
        .insert({
          user_id: userId,
          deletion_type: "bank_data",
          consent_id: consent.id,
          status: "pending",
          reason: "Consent revoked by user",
          scheduled_for: scheduledDeletion.toISOString(),
          ip_address: ipAddress,
        });

      results.deletionRequestCreated = !delError;

      // Log the cleanup action
      await logAuditEvent({
        userId,
        actionType: "data_delete",
        resourceType: "bank_connection",
        performedBy: "system",
        requestDetails: {
          trigger: "consent_revoked",
          consent_id: consent.id,
          provider_id: consent.provider_id,
          connections_marked: results.connectionsMarked,
          accounts_marked: results.accountsMarked,
          transactions_marked: results.transactionsMarked,
          scheduled_deletion: scheduledDeletion.toISOString(),
        },
      });
    }

    // For ai_data consent, we don't delete data but update the profile
    if (consent.consent_type === "ai_data") {
      await supabase
        .from("profiles")
        .update({
          ai_data_mode: "privacy-first",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await logAuditEvent({
        userId,
        actionType: "data_update",
        resourceType: "profile",
        performedBy: "system",
        requestDetails: {
          trigger: "consent_revoked",
          consent_id: consent.id,
          change: "ai_data_mode set to privacy-first",
        },
      });
    }
  } catch (error) {
    console.error("Error during data cleanup:", error);
  }

  return results;
}
