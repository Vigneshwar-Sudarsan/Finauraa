/**
 * Security utilities for AI interactions
 * Prevents prompt injection and data leakage
 */

// Patterns that could indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(previous|all|above)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /\[system\]/i,
  /<system>/i,
  /assistant\s*:/i,
  /\[assistant\]/i,
  /<assistant>/i,
  /pretend\s+(you|to\s+be)/i,
  /act\s+as\s+(if|a)/i,
  /roleplay\s+as/i,
  /jailbreak/i,
  /bypass\s+(safety|filter|restriction)/i,
  /reveal\s+(system|prompt|instruction)/i,
  /what\s+(are|is)\s+your\s+(system|instructions?|prompt)/i,
  /show\s+me\s+(your|the)\s+(system|prompt)/i,
];

// Characters that could be used for injection
const SUSPICIOUS_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export interface SanitizeResult {
  sanitized: string;
  wasModified: boolean;
  injectionDetected: boolean;
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): SanitizeResult {
  let sanitized = input;
  let wasModified = false;
  let injectionDetected = false;

  // Remove control characters
  const withoutControlChars = sanitized.replace(SUSPICIOUS_CHARS, "");
  if (withoutControlChars !== sanitized) {
    sanitized = withoutControlChars;
    wasModified = true;
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      injectionDetected = true;
      break;
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

  return { sanitized, wasModified, injectionDetected };
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
