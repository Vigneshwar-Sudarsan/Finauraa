/**
 * Timing-safe HMAC verification utility for webhook signatures
 *
 * This utility demonstrates direct usage of crypto.timingSafeEqual() for
 * SEC-01 compliance (timing attack prevention). While Stripe provides its own
 * verification, this utility can be used for non-Stripe webhooks (e.g., Tarabut
 * Gateway, custom integrations) that require manual HMAC verification.
 *
 * Security considerations:
 * - Uses crypto.timingSafeEqual() to prevent timing attacks
 * - Handles buffer length mismatch safely (timingSafeEqual throws if lengths differ)
 * - Constant-time comparison prevents attackers from guessing signatures byte-by-byte
 *
 * @see https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
 */

import crypto from "crypto";

/**
 * Result of webhook signature verification
 */
export interface WebhookVerificationResult {
  /** Whether the signature is valid */
  verified: boolean;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Options for signature verification
 */
export interface VerifySignatureOptions {
  /** Hash algorithm to use (default: sha256) */
  algorithm?: "sha256" | "sha512" | "sha1";
}

/**
 * Verifies a webhook signature using timing-safe comparison
 *
 * This function computes the expected HMAC signature and compares it to the
 * provided signature using crypto.timingSafeEqual() to prevent timing attacks.
 *
 * @param payload - Raw webhook payload string
 * @param signature - Signature to verify (hex-encoded)
 * @param secret - Secret key for HMAC computation
 * @param options - Verification options
 * @returns Verification result with verified boolean and optional error
 *
 * @example
 * ```typescript
 * const result = verifyWebhookSignature(
 *   req.body,
 *   req.headers['x-signature'],
 *   process.env.WEBHOOK_SECRET
 * );
 *
 * if (!result.verified) {
 *   return res.status(401).json({ error: result.error });
 * }
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  options: VerifySignatureOptions = {}
): WebhookVerificationResult {
  // Validate inputs
  if (!payload) {
    return {
      verified: false,
      error: "Payload cannot be empty",
    };
  }

  if (!signature) {
    return {
      verified: false,
      error: "Signature cannot be empty",
    };
  }

  if (!secret) {
    return {
      verified: false,
      error: "Secret cannot be empty",
    };
  }

  const algorithm = options.algorithm || "sha256";

  try {
    // Compute expected signature
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload, "utf8");
    const expectedSignature = hmac.digest("hex");

    // Convert both signatures to buffers for timing-safe comparison
    // Note: Buffer.from() with 'hex' encoding will create buffers of different
    // lengths if the signatures are different lengths, which we must handle
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const actualBuffer = Buffer.from(signature, "hex");

    // Handle buffer length mismatch BEFORE calling timingSafeEqual
    // timingSafeEqual() throws a RangeError if buffer lengths differ
    if (expectedBuffer.length !== actualBuffer.length) {
      return {
        verified: false,
        error: "Signature length mismatch",
      };
    }

    // Perform timing-safe comparison
    // This is the critical SEC-01 requirement: constant-time comparison
    // prevents timing attacks where attackers measure comparison time
    // to guess signatures byte-by-byte
    const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    return {
      verified: isValid,
      error: isValid ? undefined : "Invalid signature",
    };
  } catch (error) {
    // Catch any unexpected errors (e.g., invalid algorithm, crypto failures)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      verified: false,
      error: `Verification failed: ${errorMessage}`,
    };
  }
}
