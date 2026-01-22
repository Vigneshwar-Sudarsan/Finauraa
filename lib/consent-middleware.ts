/**
 * Consent Middleware
 * BOBF/PDPL compliant consent verification for data access
 *
 * This middleware ensures that:
 * 1. User has an active bank_access consent before accessing financial data
 * 2. Consent is not expired
 * 3. All access attempts are logged for audit trail
 */

import { NextResponse } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { logAuditEvent, AuditResourceType } from "@/lib/audit";

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentId?: string;
  expiresAt?: string;
  error?: string;
  errorCode?: "NO_CONSENT" | "CONSENT_EXPIRED" | "CONSENT_REVOKED" | "CHECK_FAILED";
}

/**
 * Check if user has active bank_access consent
 */
export async function checkBankAccessConsent(
  supabase: SupabaseClient,
  userId: string
): Promise<ConsentCheckResult> {
  try {
    const { data: consent, error } = await supabase
      .from("user_consents")
      .select("id, consent_status, consent_expires_at")
      .eq("user_id", userId)
      .eq("consent_type", "bank_access")
      .eq("consent_status", "active")
      .gte("consent_expires_at", new Date().toISOString())
      .order("consent_given_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No consent found (PGRST116 is "no rows returned")
      if (error.code === "PGRST116") {
        // Check if there's an expired or revoked consent
        const { data: anyConsent } = await supabase
          .from("user_consents")
          .select("consent_status, consent_expires_at")
          .eq("user_id", userId)
          .eq("consent_type", "bank_access")
          .order("consent_given_at", { ascending: false })
          .limit(1)
          .single();

        if (anyConsent) {
          if (anyConsent.consent_status === "revoked") {
            return {
              hasConsent: false,
              error: "Your bank data consent has been revoked. Please reconnect your bank to continue.",
              errorCode: "CONSENT_REVOKED",
            };
          }
          if (anyConsent.consent_status === "expired" ||
              new Date(anyConsent.consent_expires_at) < new Date()) {
            return {
              hasConsent: false,
              error: "Your bank data consent has expired. Please renew your consent to continue.",
              errorCode: "CONSENT_EXPIRED",
            };
          }
        }

        return {
          hasConsent: false,
          error: "No active consent found. Please connect your bank to grant access.",
          errorCode: "NO_CONSENT",
        };
      }

      console.error("Error checking consent:", error);
      return {
        hasConsent: false,
        error: "Failed to verify consent status",
        errorCode: "CHECK_FAILED",
      };
    }

    return {
      hasConsent: true,
      consentId: consent.id,
      expiresAt: consent.consent_expires_at,
    };
  } catch (error) {
    console.error("Consent check error:", error);
    return {
      hasConsent: false,
      error: "Failed to verify consent status",
      errorCode: "CHECK_FAILED",
    };
  }
}

/**
 * Middleware wrapper for finance API routes
 * Verifies consent and logs access attempts
 */
export async function withConsentCheck<T>(
  supabase: SupabaseClient,
  user: User,
  resourceType: AuditResourceType,
  requestPath: string,
  handler: (consentId: string) => Promise<T>
): Promise<T | NextResponse> {
  const startTime = Date.now();
  const consentResult = await checkBankAccessConsent(supabase, user.id);

  if (!consentResult.hasConsent) {
    // Log denied access attempt
    await logAuditEvent({
      userId: user.id,
      actionType: "data_access",
      resourceType,
      performedBy: "user",
      requestPath,
      responseStatus: 403,
      responseDetails: {
        denied: true,
        reason: consentResult.errorCode,
      },
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: consentResult.error,
        code: consentResult.errorCode,
        requiresConsent: true,
      },
      { status: 403 }
    );
  }

  // Log successful access (will be completed after handler returns)
  const result = await handler(consentResult.consentId!);

  // Log successful data access
  await logAuditEvent({
    userId: user.id,
    actionType: "data_access",
    resourceType,
    performedBy: "user",
    requestPath,
    responseStatus: 200,
    responseDetails: {
      consentId: consentResult.consentId,
    },
    durationMs: Date.now() - startTime,
  });

  return result;
}

/**
 * Simple consent check that returns a response if consent is missing
 * Use this for quick checks without the full wrapper
 */
export async function requireBankConsent(
  supabase: SupabaseClient,
  userId: string,
  requestPath?: string
): Promise<{ allowed: true; consentId: string } | { allowed: false; response: NextResponse }> {
  const result = await checkBankAccessConsent(supabase, userId);

  if (!result.hasConsent) {
    // Log denied access
    await logAuditEvent({
      userId,
      actionType: "data_access",
      resourceType: "bank_account",
      performedBy: "user",
      requestPath,
      responseStatus: 403,
      responseDetails: {
        denied: true,
        reason: result.errorCode,
      },
    });

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: result.error,
          code: result.errorCode,
          requiresConsent: true,
        },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    consentId: result.consentId!,
  };
}

/**
 * Log a successful data access event
 * Call this after successfully returning data
 */
export async function logDataAccessSuccess(
  userId: string,
  resourceType: AuditResourceType,
  consentId: string,
  requestPath: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType: "data_access",
    resourceType,
    performedBy: "user",
    requestPath,
    responseStatus: 200,
    responseDetails: {
      consentId,
      ...details,
    },
  });
}
