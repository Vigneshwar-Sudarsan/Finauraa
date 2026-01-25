/**
 * Webhook event idempotency utilities
 *
 * Prevents duplicate processing of webhook events from provider retries.
 * Stripe (and other webhook providers) retry events for up to 3 days if they don't
 * receive a 2xx response. This module tracks processed events to ensure exactly-once semantics.
 *
 * RETENTION POLICY: Events are kept for 7 days (2x Stripe's retry window).
 * Cleanup can be done via cron: DELETE FROM processed_webhook_events WHERE processed_at < NOW() - INTERVAL '7 days';
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Get server-side Supabase client with service role access
 * Webhook handlers need elevated permissions to write to processed_webhook_events table
 */
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Check if a webhook event has already been processed
 *
 * @param eventId - Unique event ID from webhook provider (e.g., Stripe event ID)
 * @returns true if event was already processed, false otherwise
 *
 * **Fail-open behavior**: If database is unreachable, returns false to allow processing.
 * This prevents webhook failures from blocking legitimate events, but logs a warning
 * for monitoring. The tradeoff is accepting potential duplicate processing during
 * database outages (rare) vs blocking all webhooks (unacceptable).
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("processed_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      console.error("Database error during idempotency check:", error);
      console.warn(`FAIL-OPEN: Allowing event ${eventId} to process despite DB error`);
      // Fail-open: Allow processing if DB is unreachable
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error("Unexpected error during idempotency check:", error);
    console.warn(`FAIL-OPEN: Allowing event ${eventId} to process despite error`);
    // Fail-open: Allow processing on unexpected errors
    return false;
  }
}

/**
 * Mark a webhook event as processed
 *
 * Call this AFTER successful processing to prevent duplicate handling on retries.
 * If this fails, the event will be reprocessed on the next retry (safe but wasteful).
 *
 * @param eventId - Unique event ID from webhook provider
 * @param eventType - Event type for debugging (e.g., "customer.subscription.updated")
 * @param metadata - Optional metadata to store with the event (for debugging/auditing)
 *
 * **Error handling**: Logs errors but doesn't throw. Marking an event as processed is
 * best-effort - failures here allow duplicate processing on retry, which is acceptable
 * since webhook handlers should be idempotent anyway.
 */
export async function markEventProcessed(
  eventId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("processed_webhook_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        metadata: metadata || null,
      });

    if (error) {
      // UNIQUE constraint violation is OK - means event was already marked
      // (race condition between concurrent retries)
      if (error.code === "23505") {
        console.log(`Event ${eventId} already marked as processed (race condition)`);
        return;
      }

      console.error("Failed to mark event as processed:", error);
      // Don't throw - this is best-effort tracking
    }
  } catch (error) {
    console.error("Unexpected error marking event as processed:", error);
    // Don't throw - this is best-effort tracking
  }
}
