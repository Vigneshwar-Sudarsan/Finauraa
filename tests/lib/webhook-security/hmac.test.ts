/**
 * Tests for timing-safe HMAC verification utility
 *
 * These tests verify:
 * 1. Valid signature verification
 * 2. Invalid signature rejection
 * 3. Buffer length mismatch handling (must not throw)
 * 4. Empty input validation
 * 5. Different hash algorithm support
 * 6. Edge cases and error conditions
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "@/lib/webhook-security/hmac";

describe("verifyWebhookSignature", () => {
  const testPayload = '{"event":"test","data":{"id":"123"}}';
  const testSecret = "test_secret_key_12345";

  // Helper function to generate valid signature
  function generateSignature(
    payload: string,
    secret: string,
    algorithm: "sha256" | "sha512" | "sha1" = "sha256"
  ): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload, "utf8");
    return hmac.digest("hex");
  }

  describe("Valid signature verification", () => {
    it("should verify a valid sha256 signature", () => {
      const validSignature = generateSignature(testPayload, testSecret, "sha256");

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should verify a valid sha512 signature", () => {
      const validSignature = generateSignature(testPayload, testSecret, "sha512");

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        testSecret,
        { algorithm: "sha512" }
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should verify a valid sha1 signature", () => {
      const validSignature = generateSignature(testPayload, testSecret, "sha1");

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        testSecret,
        { algorithm: "sha1" }
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should verify signature with different payload", () => {
      const differentPayload = '{"event":"different","data":{"id":"456"}}';
      const validSignature = generateSignature(
        differentPayload,
        testSecret,
        "sha256"
      );

      const result = verifyWebhookSignature(
        differentPayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should verify signature with different secret", () => {
      const differentSecret = "different_secret_key";
      const validSignature = generateSignature(
        testPayload,
        differentSecret,
        "sha256"
      );

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        differentSecret
      );

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Invalid signature rejection", () => {
    it("should reject signature with wrong payload", () => {
      const validSignature = generateSignature(testPayload, testSecret);
      const wrongPayload = '{"event":"wrong","data":{"id":"999"}}';

      const result = verifyWebhookSignature(
        wrongPayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("should reject signature with wrong secret", () => {
      const validSignature = generateSignature(testPayload, testSecret);
      const wrongSecret = "wrong_secret_key";

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        wrongSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("should reject completely invalid signature", () => {
      const invalidSignature = "this_is_not_a_valid_signature";

      const result = verifyWebhookSignature(
        testPayload,
        invalidSignature,
        testSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature length mismatch");
    });

    it("should reject signature with wrong algorithm", () => {
      // Generate signature with sha256
      const sha256Signature = generateSignature(testPayload, testSecret, "sha256");

      // Try to verify with sha512
      const result = verifyWebhookSignature(
        testPayload,
        sha256Signature,
        testSecret,
        { algorithm: "sha512" }
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature length mismatch");
    });

    it("should reject signature with single character difference", () => {
      const validSignature = generateSignature(testPayload, testSecret);
      // Change one character in the signature
      const tamperedSignature =
        validSignature.substring(0, 10) +
        (validSignature[10] === "a" ? "b" : "a") +
        validSignature.substring(11);

      const result = verifyWebhookSignature(
        testPayload,
        tamperedSignature,
        testSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });
  });

  describe("Buffer length mismatch handling", () => {
    it("should handle signature that is too short", () => {
      const validSignature = generateSignature(testPayload, testSecret);
      const shortSignature = validSignature.substring(0, 10); // Much shorter

      const result = verifyWebhookSignature(
        testPayload,
        shortSignature,
        testSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature length mismatch");
    });

    it("should handle signature that is too long", () => {
      const validSignature = generateSignature(testPayload, testSecret);
      const longSignature = validSignature + "00"; // Add extra hex bytes

      const result = verifyWebhookSignature(
        testPayload,
        longSignature,
        testSecret
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature length mismatch");
    });

    it("should handle empty signature string", () => {
      const result = verifyWebhookSignature(testPayload, "", testSecret);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature cannot be empty");
    });

    it("should not throw on buffer length mismatch", () => {
      // This test ensures we handle the case that would cause
      // crypto.timingSafeEqual() to throw a RangeError
      const shortSignature = "abc";

      expect(() => {
        verifyWebhookSignature(testPayload, shortSignature, testSecret);
      }).not.toThrow();
    });
  });

  describe("Empty input validation", () => {
    it("should reject empty payload", () => {
      const validSignature = generateSignature(testPayload, testSecret);

      const result = verifyWebhookSignature("", validSignature, testSecret);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Payload cannot be empty");
    });

    it("should reject empty signature", () => {
      const result = verifyWebhookSignature(testPayload, "", testSecret);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Signature cannot be empty");
    });

    it("should reject empty secret", () => {
      const validSignature = generateSignature(testPayload, testSecret);

      const result = verifyWebhookSignature(testPayload, validSignature, "");

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Secret cannot be empty");
    });

    it("should reject when all inputs are empty", () => {
      const result = verifyWebhookSignature("", "", "");

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Payload cannot be empty");
    });
  });

  describe("Algorithm support", () => {
    it("should default to sha256 when no algorithm specified", () => {
      const sha256Signature = generateSignature(testPayload, testSecret, "sha256");

      const result = verifyWebhookSignature(
        testPayload,
        sha256Signature,
        testSecret
      );

      expect(result.verified).toBe(true);
    });

    it("should support sha512 algorithm", () => {
      const sha512Signature = generateSignature(testPayload, testSecret, "sha512");

      const result = verifyWebhookSignature(
        testPayload,
        sha512Signature,
        testSecret,
        { algorithm: "sha512" }
      );

      expect(result.verified).toBe(true);
    });

    it("should support sha1 algorithm (legacy support)", () => {
      const sha1Signature = generateSignature(testPayload, testSecret, "sha1");

      const result = verifyWebhookSignature(
        testPayload,
        sha1Signature,
        testSecret,
        { algorithm: "sha1" }
      );

      expect(result.verified).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle very long payloads", () => {
      const longPayload = JSON.stringify({ data: "x".repeat(10000) });
      const validSignature = generateSignature(longPayload, testSecret);

      const result = verifyWebhookSignature(
        longPayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(true);
    });

    it("should handle payloads with special characters", () => {
      const specialPayload = '{"emoji":"🎉","unicode":"\\u00e9","newline":"\\n"}';
      const validSignature = generateSignature(specialPayload, testSecret);

      const result = verifyWebhookSignature(
        specialPayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(true);
    });

    it("should handle very long secrets", () => {
      const longSecret = "x".repeat(1000);
      const validSignature = generateSignature(testPayload, longSecret);

      const result = verifyWebhookSignature(
        testPayload,
        validSignature,
        longSecret
      );

      expect(result.verified).toBe(true);
    });

    it("should handle whitespace in payload", () => {
      const whitespacePayload = '  {"event": "test"}  ';
      const validSignature = generateSignature(whitespacePayload, testSecret);

      const result = verifyWebhookSignature(
        whitespacePayload,
        validSignature,
        testSecret
      );

      expect(result.verified).toBe(true);
    });
  });
});
