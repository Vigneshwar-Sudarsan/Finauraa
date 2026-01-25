/**
 * Security tests for Stripe webhook handler
 *
 * Tests SEC-01 (timing-safe signature verification) and SEC-03 (payload validation)
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";
import Stripe from "stripe";

// Mock Stripe SDK
const mockConstructEvent = vi.fn();
vi.mock("stripe", () => {
  return {
    default: class Stripe {
      webhooks = {
        constructEvent: mockConstructEvent,
      };
    },
  };
});

// Mock modules
vi.mock("@/lib/webhook-security/idempotency", () => ({
  isEventProcessed: vi.fn().mockResolvedValue(false),
  markEventProcessed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "test-user-id" } })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "test-billing-id" } })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/audit", () => ({
  logPaymentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email", () => ({
  sendPaymentFailedNotification: vi.fn().mockResolvedValue(undefined),
  sendTrialEndingNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock environment variables
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

describe("Webhook Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConstructEvent.mockReset();
  });

  describe("Signature Verification (SEC-01)", () => {
    it("should reject request without stripe-signature header", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "test.event" }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("No signature");
    });

    it("should reject request with invalid signature", async () => {
      // Mock Stripe to throw on invalid signature
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "invalid-signature",
        },
        body: JSON.stringify({ type: "test.event" }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Invalid signature");
    });

    it("should accept request with valid signature", async () => {
      const validEvent = {
        id: "evt_test_valid",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test",
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [
                {
                  price: {
                    id: "price_test",
                  },
                  current_period_end: 1234567890,
                },
              ],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => validEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockConstructEvent).toHaveBeenCalled();
    });
  });

  describe("Payload Validation (SEC-03)", () => {
    it("should reject malformed subscription event (missing required fields)", async () => {
      const malformedEvent = {
        id: "evt_test_malformed",
        type: "customer.subscription.updated",
        data: {
          object: {
            // Missing required fields: id, customer, status, created, items
            status: "active",
          },
        },
      };

      mockConstructEvent.mockImplementation(() => malformedEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(malformedEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Invalid payload");
    });

    it("should reject malformed invoice event (wrong field types)", async () => {
      const malformedEvent = {
        id: "evt_test_malformed",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_test",
            customer: "cus_test",
            amount_due: "not-a-number", // Should be number
            lines: {
              data: [],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => malformedEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(malformedEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Invalid payload");
    });

    it("should accept valid event with extra fields (passthrough working)", async () => {
      const validEventWithExtras = {
        id: "evt_test_extras",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test",
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [
                {
                  price: {
                    id: "price_test",
                  },
                  current_period_end: 1234567890,
                },
              ],
            },
            // Extra fields that might be added in future Stripe API versions
            extra_field_1: "value1",
            extra_field_2: { nested: "value2" },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => validEventWithExtras);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(validEventWithExtras),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it("should handle unknown event types gracefully", async () => {
      const unknownEvent = {
        id: "evt_test_unknown",
        type: "unknown.event.type",
        data: {
          object: {
            id: "obj_test",
          },
        },
      };

      mockConstructEvent.mockImplementation(() => unknownEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(unknownEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      // Should accept and log, not reject
      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });
  });

  describe("Idempotency Tests", () => {
    it("should process event first time and return 200", async () => {
      const { isEventProcessed, markEventProcessed } = await import(
        "@/lib/webhook-security/idempotency"
      );

      // Mock: event not processed yet
      (isEventProcessed as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const validEvent = {
        id: "evt_test_first",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test",
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [
                {
                  price: {
                    id: "price_test",
                  },
                  current_period_end: 1234567890,
                },
              ],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => validEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(isEventProcessed).toHaveBeenCalledWith("evt_test_first");
      expect(markEventProcessed).toHaveBeenCalledWith(
        "evt_test_first",
        "customer.subscription.updated",
        expect.objectContaining({
          customer: "cus_test",
        })
      );
    });

    it("should skip duplicate event ID and return 200", async () => {
      const { isEventProcessed, markEventProcessed } = await import(
        "@/lib/webhook-security/idempotency"
      );

      // Mock: event already processed
      (isEventProcessed as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const duplicateEvent = {
        id: "evt_test_duplicate",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test",
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [
                {
                  price: {
                    id: "price_test",
                  },
                  current_period_end: 1234567890,
                },
              ],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => duplicateEvent);


      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(duplicateEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(isEventProcessed).toHaveBeenCalledWith("evt_test_duplicate");
      // Should NOT mark as processed again
      expect(markEventProcessed).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling Tests", () => {
    it("should validate payload structure before processing", async () => {
      // This test verifies that validation happens BEFORE business logic
      // If validation fails, we never reach the database/business logic layer
      const invalidEvent = {
        id: "evt_test_validation_order",
        type: "customer.subscription.updated",
        data: {
          object: {
            // Missing required field 'id'
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => invalidEvent);

      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(invalidEvent),
      });

      const response = await POST(request);
      const json = await response.json();

      // Should reject with 400 due to validation failure
      expect(response.status).toBe(400);
      expect(json.error).toBe("Invalid payload");
    });

    it("should mark event as processed only after successful handling", async () => {
      const { markEventProcessed } = await import(
        "@/lib/webhook-security/idempotency"
      );

      const validEvent = {
        id: "evt_test_success",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_test",
            customer: "cus_test",
            status: "active",
            cancel_at_period_end: false,
            created: 1234567890,
            items: {
              data: [
                {
                  price: {
                    id: "price_test",
                  },
                  current_period_end: 1234567890,
                },
              ],
            },
          },
        },
      };

      mockConstructEvent.mockImplementation(() => validEvent);

      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Should mark as processed after successful handling
      expect(markEventProcessed).toHaveBeenCalledWith(
        "evt_test_success",
        "customer.subscription.updated",
        expect.objectContaining({
          customer: "cus_test",
        })
      );
    });
  });
});
