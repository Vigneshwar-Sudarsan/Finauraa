import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/cron/data-retention
 * Vercel Cron Job: Runs daily at 1 AM UTC
 *
 * This job handles PDPL data retention requirements:
 * 1. Cleans up data past retention period after consent revocation
 * 2. Anonymizes transaction data if configured
 * 3. Archives old audit logs
 * 4. Processes pending deletion requests
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const results: Record<string, number> = {
      transactionsDeleted: 0,
      transactionsAnonymized: 0,
      accountsDeleted: 0,
      deletionRequestsProcessed: 0,
    };

    // Get retention policies
    const { data: policies } = await supabase
      .from("data_retention_policies")
      .select("*");

    const policyMap: Record<string, { retention_days: number; anonymization_required: boolean }> = {};
    (policies || []).forEach((p) => {
      policyMap[p.data_type] = {
        retention_days: p.retention_period_days,
        anonymization_required: p.anonymization_required,
      };
    });

    // Default retention period (30 days after revocation)
    const defaultRetentionDays = parseInt(process.env.DATA_RETENTION_AFTER_REVOCATION_DAYS || "30", 10);

    // 1. Find revoked consents past retention period
    const retentionDate = new Date(now.getTime() - defaultRetentionDays * 24 * 60 * 60 * 1000);

    const { data: revokedConsents } = await supabase
      .from("user_consents")
      .select("id, user_id, revoked_at")
      .eq("consent_status", "revoked")
      .lt("revoked_at", retentionDate.toISOString());

    if (revokedConsents && revokedConsents.length > 0) {
      for (const consent of revokedConsents) {
        // Soft delete or anonymize transactions linked to this consent
        const transactionPolicy = policyMap.transactions || { retention_days: 365, anonymization_required: true };

        if (transactionPolicy.anonymization_required) {
          // Anonymize transactions
          const { data: anonymized } = await supabase
            .from("transactions")
            .update({
              description: "[ANONYMIZED]",
              merchant_name: null,
              merchant_logo: null,
              is_anonymized: true,
              updated_at: now.toISOString(),
            })
            .eq("consent_id", consent.id)
            .eq("is_anonymized", false)
            .select("id");

          results.transactionsAnonymized += anonymized?.length || 0;
        } else {
          // Hard delete transactions past retention
          const { data: deleted } = await supabase
            .from("transactions")
            .delete()
            .eq("consent_id", consent.id)
            .lt("retention_expires_at", now.toISOString())
            .select("id");

          results.transactionsDeleted += deleted?.length || 0;
        }
      }
    }

    // 2. Process pending deletion requests
    const { data: pendingDeletions } = await supabase
      .from("data_deletion_requests")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); // At least 24h old

    for (const request of pendingDeletions || []) {
      try {
        // Mark as processing
        await supabase
          .from("data_deletion_requests")
          .update({ status: "processing", updated_at: now.toISOString() })
          .eq("id", request.id);

        const dataTypes = request.data_types as string[];

        // Delete requested data types
        if (dataTypes.includes("transactions") || dataTypes.includes("all")) {
          await supabase
            .from("transactions")
            .update({
              deleted_at: now.toISOString(),
              deleted_by: "system",
            })
            .eq("user_id", request.user_id)
            .is("deleted_at", null);
        }

        if (dataTypes.includes("bank_accounts") || dataTypes.includes("all")) {
          await supabase
            .from("bank_accounts")
            .update({
              deleted_at: now.toISOString(),
              deleted_by: "system",
            })
            .eq("user_id", request.user_id)
            .is("deleted_at", null);
        }

        if (dataTypes.includes("bank_connections") || dataTypes.includes("all")) {
          await supabase
            .from("bank_connections")
            .update({
              deleted_at: now.toISOString(),
              deleted_by: "system",
            })
            .eq("user_id", request.user_id)
            .is("deleted_at", null);
        }

        // Mark as completed
        await supabase
          .from("data_deletion_requests")
          .update({
            status: "completed",
            completed_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", request.id);

        results.deletionRequestsProcessed++;
      } catch (deleteError) {
        console.error(`Error processing deletion request ${request.id}:`, deleteError);
        await supabase
          .from("data_deletion_requests")
          .update({
            status: "failed",
            error_message: String(deleteError),
            updated_at: now.toISOString(),
          })
          .eq("id", request.id);
      }
    }

    // 3. Clean up soft-deleted data past retention period
    const hardDeleteDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days

    // Hard delete transactions that were soft-deleted > 90 days ago
    const { data: hardDeleted } = await supabase
      .from("transactions")
      .delete()
      .lt("deleted_at", hardDeleteDate.toISOString())
      .select("id");

    results.transactionsDeleted += hardDeleted?.length || 0;

    // Log cron execution
    await supabase.from("audit_logs").insert({
      user_id: null,
      action_type: "data_delete",
      resource_type: "transaction",
      performed_by: "cron",
      request_path: "/api/cron/data-retention",
      request_details: {
        job: "data-retention",
        ...results,
      },
      response_status: 200,
    });

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error (data-retention):", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger
export { GET as POST };
