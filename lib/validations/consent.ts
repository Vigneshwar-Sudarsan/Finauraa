import { z, ZodError, ZodSchema } from "zod";

/**
 * Consent validation schemas and utilities
 * For PDPL/BOBF compliant consent management
 */

// Consent type enum
export const consentTypeSchema = z.enum([
  "bank_access",
  "ai_data",
  "data_sharing",
  "marketing",
  "analytics",
  "third_party",
]);

// Consent status enum
export const consentStatusSchema = z.enum([
  "active",
  "revoked",
  "expired",
]);

/**
 * Schema for creating a consent record
 * POST /api/consents
 */
export const createConsentSchema = z.object({
  consent_type: consentTypeSchema,
  provider_id: z.string().max(255).optional(),
  provider_name: z.string().max(255).optional(),
  permissions_granted: z
    .array(z.string())
    .min(1, "At least one permission must be granted"),
  purpose: z
    .string()
    .min(10, "Purpose must be at least 10 characters")
    .max(1000, "Purpose cannot exceed 1000 characters"),
  scope: z.string().max(500).optional(),
  expires_in_days: z
    .number()
    .int()
    .min(1, "Expiry must be at least 1 day")
    .max(365, "Expiry cannot exceed 365 days")
    .default(90),
  consent_version: z.string().default("1.0"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for revoking consent
 * DELETE /api/consents/[id]
 */
export const revokeConsentSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
});

/**
 * Validates a request body against a Zod schema
 * Returns a discriminated union for type-safe error handling
 */
export function validateRequestBody<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Formats a Zod error into a user-friendly API response format
 */
export function formatZodError(error: ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));

  return {
    error: "Validation failed",
    details,
  };
}

/**
 * Schema for data export requests
 * POST /api/user/data-export
 * PDPL Requirement: Right to data portability
 */
export const dataExportRequestSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  include_profile: z.boolean().default(true),
  include_transactions: z.boolean().default(true),
  include_accounts: z.boolean().default(true),
  include_consents: z.boolean().default(true),
  include_messages: z.boolean().default(false),
});

// Type exports
export type ConsentType = z.infer<typeof consentTypeSchema>;
export type ConsentStatus = z.infer<typeof consentStatusSchema>;
export type CreateConsentInput = z.infer<typeof createConsentSchema>;
export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;
export type DataExportRequestInput = z.infer<typeof dataExportRequestSchema>;
