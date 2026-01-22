import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendConsentExpiryWarning } from "@/lib/email";

/**
 * POST /api/cron/expire-consents
 * Vercel Cron Job: Runs daily at midnight UTC
 *
 * This job:
 * 1. Finds and marks expired consents
 * 2. Finds consents expiring in 7 days and sends notification emails
 * 3. Logs all actions to audit_logs
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use service role for cron job
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Find and mark expired consents
    const { data: expiredConsents, error: expireError } = await supabase
      .from("user_consents")
      .update({
        consent_status: "expired",
        updated_at: now,
      })
      .eq("consent_status", "active")
      .lt("consent_expires_at", now)
      .select("id, user_id, consent_type, provider_name");

    if (expireError) {
      console.error("Error expiring consents:", expireError);
    }

    // Log expired consents
    const expiredCount = expiredConsents?.length || 0;
    if (expiredCount > 0) {
      // Log each expiration to audit_logs
      const auditLogs = expiredConsents!.map((consent) => ({
        user_id: consent.user_id,
        action_type: "consent_expired",
        resource_type: "consent",
        resource_id: consent.id,
        performed_by: "cron",
        request_path: "/api/cron/expire-consents",
        request_details: {
          consent_type: consent.consent_type,
          provider_name: consent.provider_name,
        },
        response_status: 200,
      }));

      await supabase.from("audit_logs").insert(auditLogs);
    }

    // 2. Find consents expiring in exactly 7 days (to avoid duplicate notifications)
    const sevenDaysExact = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

    const { data: expiringConsents } = await supabase
      .from("user_consents")
      .select(`
        id,
        user_id,
        consent_type,
        consent_expires_at,
        provider_name,
        profiles!user_consents_user_id_fkey (
          email,
          full_name
        )
      `)
      .eq("consent_status", "active")
      .gte("consent_expires_at", sixDaysFromNow.toISOString())
      .lte("consent_expires_at", sevenDaysExact.toISOString());

    const expiringSoonCount = expiringConsents?.length || 0;
    let emailsSent = 0;

    // Send email notifications to users with expiring consents
    if (expiringSoonCount > 0 && expiringConsents) {
      console.log(`Found ${expiringSoonCount} consents expiring within 7 days`);

      for (const consent of expiringConsents) {
        // profiles is returned as array from foreign key relation, get first element
        const profileData = consent.profiles as { email: string; full_name: string }[] | { email: string; full_name: string } | null;
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        if (profile?.email) {
          const result = await sendConsentExpiryWarning(
            profile.email,
            profile.full_name || "",
            consent.consent_type,
            consent.provider_name,
            consent.consent_expires_at
          );
          if (result.success) {
            emailsSent++;
          }
        }
      }
    }

    // Log cron execution
    await supabase.from("audit_logs").insert({
      user_id: null,
      action_type: "data_update",
      resource_type: "consent",
      performed_by: "cron",
      request_path: "/api/cron/expire-consents",
      request_details: {
        job: "expire-consents",
        expired_count: expiredCount,
        expiring_soon_count: expiringSoonCount,
        emails_sent: emailsSent,
      },
      response_status: 200,
    });

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      emailsSent,
      timestamp: now,
    });
  } catch (error) {
    console.error("Cron job error (expire-consents):", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger
export { GET as POST };
