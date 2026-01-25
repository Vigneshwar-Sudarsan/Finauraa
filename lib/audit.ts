/**
 * Audit Logging Utility
 * PDPL/CBB compliant audit trail for all data access and modifications
 */

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditActionType =
  | "data_access"
  | "data_fetch"
  | "data_create"
  | "data_update"
  | "data_delete"
  | "consent_given"
  | "consent_revoked"
  | "consent_expired"
  | "login"
  | "logout"
  | "password_change"
  | "export_requested"
  | "export_completed"
  | "deletion_requested"
  | "deletion_completed"
  | "bank_connected"
  | "bank_disconnected"
  | "bank_synced"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_canceled"
  | "payment_succeeded"
  | "payment_failed"
  | "admin_action"
  | "admin_grant"
  | "admin_revoke"
  | "admin_access_denied";

export type AuditResourceType =
  | "profile"
  | "bank_connection"
  | "bank_account"
  | "transaction"
  | "consent"
  | "conversation"
  | "message"
  | "subscription"
  | "payment"
  | "export"
  | "deletion"
  | "admin"
  | "feature_flag"
  | "system_config";

export type AuditPerformedBy = "user" | "system" | "admin" | "webhook" | "cron";

interface AuditLogParams {
  userId?: string;
  actionType: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: string;
  performedBy?: AuditPerformedBy;
  requestMethod?: string;
  requestPath?: string;
  requestDetails?: Record<string, unknown>;
  responseStatus?: number;
  responseDetails?: Record<string, unknown>;
  durationMs?: number;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string | null> {
  try {
    const headersList = await headers();
    return (
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Get user agent from request headers
 */
async function getUserAgent(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get("user-agent");
  } catch {
    return null;
  }
}

/**
 * Log an audit event
 * Uses service role to ensure logs are always written regardless of RLS
 */
export async function logAuditEvent(params: AuditLogParams): Promise<string | null> {
  // Skip if audit logging is disabled
  if (process.env.ENABLE_AUDIT_LOGGING === "false") {
    return null;
  }

  try {
    const supabase = await createClient();
    const [ipAddress, userAgent] = await Promise.all([getClientIp(), getUserAgent()]);

    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: params.userId || null,
        action_type: params.actionType,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        performed_by: params.performedBy || "user",
        ip_address: ipAddress,
        user_agent: userAgent,
        request_method: params.requestMethod || null,
        request_path: params.requestPath || null,
        request_details: params.requestDetails || {},
        response_status: params.responseStatus || null,
        response_details: params.responseDetails || {},
        duration_ms: params.durationMs || null,
        session_id: params.sessionId || null,
        correlation_id: params.correlationId || null,
        metadata: params.metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log audit event:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Audit logging error:", error);
    return null;
  }
}

/**
 * Create an audit logger with pre-filled context
 * Useful for logging multiple events in the same request
 */
export function createAuditLogger(context: {
  userId?: string;
  requestPath?: string;
  requestMethod?: string;
  correlationId?: string;
}) {
  return {
    log: (params: Omit<AuditLogParams, "userId" | "requestPath" | "requestMethod" | "correlationId">) =>
      logAuditEvent({
        ...params,
        userId: context.userId,
        requestPath: context.requestPath,
        requestMethod: context.requestMethod,
        correlationId: context.correlationId,
      }),

    logDataAccess: (resourceType: AuditResourceType, resourceId?: string, details?: Record<string, unknown>) =>
      logAuditEvent({
        ...context,
        actionType: "data_access",
        resourceType,
        resourceId,
        requestDetails: details,
      }),

    logDataCreate: (resourceType: AuditResourceType, resourceId?: string, details?: Record<string, unknown>) =>
      logAuditEvent({
        ...context,
        actionType: "data_create",
        resourceType,
        resourceId,
        requestDetails: details,
      }),

    logDataUpdate: (resourceType: AuditResourceType, resourceId?: string, details?: Record<string, unknown>) =>
      logAuditEvent({
        ...context,
        actionType: "data_update",
        resourceType,
        resourceId,
        requestDetails: details,
      }),

    logDataDelete: (resourceType: AuditResourceType, resourceId?: string, details?: Record<string, unknown>) =>
      logAuditEvent({
        ...context,
        actionType: "data_delete",
        resourceType,
        resourceId,
        requestDetails: details,
      }),
  };
}

/**
 * Log consent events specifically
 */
export async function logConsentEvent(
  userId: string,
  action: "consent_given" | "consent_revoked" | "consent_expired",
  consentId: string,
  details?: Record<string, unknown>
): Promise<string | null> {
  return logAuditEvent({
    userId,
    actionType: action,
    resourceType: "consent",
    resourceId: consentId,
    performedBy: action === "consent_expired" ? "system" : "user",
    requestDetails: details,
  });
}

/**
 * Log bank connection events
 */
export async function logBankEvent(
  userId: string,
  action: "bank_connected" | "bank_disconnected" | "bank_synced",
  connectionId: string,
  details?: Record<string, unknown>
): Promise<string | null> {
  return logAuditEvent({
    userId,
    actionType: action,
    resourceType: "bank_connection",
    resourceId: connectionId,
    requestDetails: details,
  });
}

/**
 * Log payment/subscription events (typically from webhooks)
 */
export async function logPaymentEvent(
  userId: string,
  action: "payment_succeeded" | "payment_failed" | "subscription_created" | "subscription_updated" | "subscription_canceled",
  resourceId: string,
  details?: Record<string, unknown>
): Promise<string | null> {
  return logAuditEvent({
    userId,
    actionType: action,
    resourceType: action.startsWith("subscription") ? "subscription" : "payment",
    resourceId,
    performedBy: "webhook",
    requestDetails: details,
  });
}

/**
 * Log admin actions (admin performed privileged operation)
 */
export async function logAdminAction(
  adminUserId: string,
  action: "admin_action" | "admin_grant" | "admin_revoke",
  resourceType: AuditResourceType,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<string | null> {
  return logAuditEvent({
    userId: adminUserId,
    actionType: action,
    resourceType,
    resourceId,
    performedBy: "admin",
    requestDetails: details,
  });
}

/**
 * Log admin access denied (non-admin attempted admin-only action)
 */
export async function logAdminAccessDenied(
  userId: string,
  attemptedAction: string,
  details?: Record<string, unknown>
): Promise<string | null> {
  return logAuditEvent({
    userId,
    actionType: "admin_access_denied",
    resourceType: "admin",
    performedBy: "user",
    requestDetails: {
      attempted_action: attemptedAction,
      ...details,
    },
  });
}
