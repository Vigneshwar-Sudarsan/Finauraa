/**
 * Security utilities for AI interactions
 * Prevents prompt injection and data leakage
 */

// HIGH RISK patterns - definitely block these
const HIGH_RISK_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /forget\s+(everything|all|previous)\s+(instructions?|prompts?)/i,
  /\[system\]/i,
  /<system>/i,
  /\[assistant\]/i,
  /<assistant>/i,
  /jailbreak/i,
  /bypass\s+(safety|filter|restriction)/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+(are|is)\s+your\s+system\s+prompt/i,
];

// MEDIUM RISK patterns - log but allow (might be legitimate)
const MEDIUM_RISK_PATTERNS = [
  /you\s+are\s+now\s+a/i,
  /pretend\s+(you\s+are|to\s+be)\s+a/i,
  /act\s+as\s+if\s+you/i,
  /roleplay\s+as/i,
];

// Characters that could be used for injection
const SUSPICIOUS_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export interface SanitizeResult {
  sanitized: string;
  wasModified: boolean;
  injectionDetected: boolean;
  riskLevel: "none" | "medium" | "high";
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): SanitizeResult {
  let sanitized = input;
  let wasModified = false;
  let injectionDetected = false;
  let riskLevel: "none" | "medium" | "high" = "none";

  // Remove control characters
  const withoutControlChars = sanitized.replace(SUSPICIOUS_CHARS, "");
  if (withoutControlChars !== sanitized) {
    sanitized = withoutControlChars;
    wasModified = true;
  }

  // Check for HIGH RISK patterns - these will be blocked
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(sanitized)) {
      injectionDetected = true;
      riskLevel = "high";
      break;
    }
  }

  // Check for MEDIUM RISK patterns - these will be logged but allowed
  if (!injectionDetected) {
    for (const pattern of MEDIUM_RISK_PATTERNS) {
      if (pattern.test(sanitized)) {
        riskLevel = "medium";
        // Don't set injectionDetected - allow these through
        break;
      }
    }
  }

  // Limit message length to prevent context overflow attacks
  const MAX_MESSAGE_LENGTH = 2000;
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH);
    wasModified = true;
  }

  // Escape any remaining potentially dangerous sequences
  sanitized = sanitized
    .replace(/```/g, "'''") // Prevent code block injection
    .replace(/\n{3,}/g, "\n\n"); // Limit consecutive newlines

  if (sanitized !== input) {
    wasModified = true;
  }

  return { sanitized, wasModified, injectionDetected, riskLevel };
}

/**
 * Sanitize conversation history
 */
export function sanitizeConversationHistory(
  messages: { role: string; content: string }[]
): { role: string; content: string }[] {
  // Limit conversation history to prevent token abuse
  const MAX_HISTORY_MESSAGES = 20;
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  return recentMessages.map((msg) => ({
    role: msg.role,
    content:
      msg.role === "user"
        ? sanitizeUserInput(msg.content).sanitized
        : msg.content.slice(0, 4000), // Limit assistant message length too
  }));
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  userId: string,
  eventType: "injection_attempt" | "rate_limit" | "suspicious_input",
  details: Record<string, unknown>
): void {
  // In production, this should go to a proper logging service
  console.warn(`[SECURITY] ${eventType}`, {
    userId: userId.slice(0, 8) + "...", // Don't log full user ID
    timestamp: new Date().toISOString(),
    ...details,
  });
}
