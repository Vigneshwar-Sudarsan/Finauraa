/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import {
  checkBankAccessConsent,
  requireBankConsent,
  ConsentResult,
} from "../consent-middleware";

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("consent-middleware", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
  });

  describe("checkBankAccessConsent", () => {
    it("returns allowed with noBanksConnected when user has no bank connections", async () => {
      // Mock bank_connections query to return count: 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 0,
            }),
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: true,
        noBanksConnected: true,
      });
    });

    it("returns allowed with consentId when user has valid consent", async () => {
      // Mock bank_connections to return count > 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 1,
            }),
          }),
        }),
      });

      // Mock user_consents to return active, non-expired consent
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "consent-123",
              consent_status: "active",
              consent_expires_at: futureDate,
            },
            error: null,
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: true,
        consentId: "consent-123",
      });
    });

    it("returns CONSENT_EXPIRED when consent exists but expired", async () => {
      // Mock bank_connections count > 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 1,
            }),
          }),
        }),
      });

      // Mock first query to fail (PGRST116 - no active consent)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      // Mock second query to return expired consent
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              consent_status: "expired",
              consent_expires_at: pastDate,
            },
            error: null,
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: false,
        error: {
          message: "Your bank data consent has expired. Please renew your consent to continue.",
          code: "CONSENT_EXPIRED",
          requiresConsent: true,
        },
      });
    });

    it("returns CONSENT_REVOKED when consent has been revoked", async () => {
      // Mock bank_connections count > 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 1,
            }),
          }),
        }),
      });

      // Mock first query to fail (PGRST116)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      // Mock second query to return revoked consent
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              consent_status: "revoked",
              consent_expires_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: false,
        error: {
          message: "Your bank data consent has been revoked. Please reconnect your bank to continue.",
          code: "CONSENT_REVOKED",
          requiresConsent: true,
        },
      });
    });

    it("returns NO_CONSENT when user has banks but never consented", async () => {
      // Mock bank_connections count > 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 1,
            }),
          }),
        }),
      });

      // Mock first query to fail (PGRST116)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      // Mock second query to return no records (PGRST116)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: false,
        error: {
          message: "Bank access authorization required. Please reconnect your bank.",
          code: "NO_CONSENT",
          requiresConsent: true,
        },
      });
    });

    it("returns CHECK_FAILED and logs to Sentry on database error", async () => {
      // Mock Supabase to throw exception
      const dbError = new Error("Database connection failed");
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      });

      const result = await checkBankAccessConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: false,
        error: {
          message: "Failed to verify consent status",
          code: "CHECK_FAILED",
          requiresConsent: false,
        },
      });

      // Verify Sentry.captureException was called
      expect(Sentry.captureException).toHaveBeenCalledWith(dbError, {
        tags: {
          component: "consent_middleware",
          failure_mode: "database_error",
        },
      });
    });
  });

  describe("requireBankConsent", () => {
    it("returns 403 response for denied cases", async () => {
      // Mock bank_connections count > 0
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 1,
            }),
          }),
        }),
      });

      // Mock consent check to return denied
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      // No expired/revoked consent found
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      });

      // Mock audit log
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await requireBankConsent(mockSupabase, "user-123");

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toHaveProperty("error");
        expect(body).toHaveProperty("code", "NO_CONSENT");
        expect(body).toHaveProperty("requiresConsent", true);
      }
    });

    it("returns allowed for noBanksConnected", async () => {
      // Mock no banks
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 0,
            }),
          }),
        }),
      });

      const result = await requireBankConsent(mockSupabase, "user-123");

      expect(result).toEqual({
        allowed: true,
        noBanksConnected: true,
      });
    });
  });
});
