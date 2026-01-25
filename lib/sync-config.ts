/**
 * Smart Sync Configuration
 * Controls automatic data synchronization thresholds and behavior
 */

export const SYNC_CONFIG = {
  // On-open sync thresholds (in milliseconds)
  FRESH_THRESHOLD: 15 * 60 * 1000, // 15 min - no sync needed
  BALANCE_ONLY_THRESHOLD: 60 * 60 * 1000, // 60 min - balance only sync
  // > 60 min - full incremental sync

  // Cron job settings
  CRON_INTERVAL_HOURS: 24, // Run once daily (Vercel Hobby limit)
  CRON_SKIP_IF_SYNCED_HOURS: 12, // Skip if synced in last 12 hours
  CRON_RATE_LIMIT_PER_MINUTE: 10, // Max users to sync per minute
  CRON_BATCH_SIZE: 5, // Process users in batches

  // Transaction fetch settings
  DEFAULT_TRANSACTION_DAYS: 90, // Days of history on first sync
  INCREMENTAL_TRANSACTION_DAYS: 7, // Days to look back for incremental sync
} as const;

/**
 * Determines what type of sync is needed based on the oldest last_synced_at timestamp
 */
export function determineSyncType(
  lastSyncedAt: string | null | undefined
): "none" | "balance-only" | "full" {
  if (!lastSyncedAt) {
    return "full"; // Never synced, need full sync
  }

  const lastSyncTime = new Date(lastSyncedAt).getTime();
  const now = Date.now();
  const staleness = now - lastSyncTime;

  if (staleness < SYNC_CONFIG.FRESH_THRESHOLD) {
    return "none"; // Fresh enough, no sync needed
  }

  if (staleness < SYNC_CONFIG.BALANCE_ONLY_THRESHOLD) {
    return "balance-only"; // Moderately stale, balance only
  }

  return "full"; // Very stale, full sync
}

/**
 * Gets the oldest last_synced_at from an array of accounts
 */
export function getOldestSyncTime(
  accounts: Array<{ last_synced_at?: string | null }>
): string | null {
  if (!accounts || accounts.length === 0) return null;

  const syncTimes = accounts
    .map((a) => a.last_synced_at)
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());

  if (syncTimes.length === 0) return null;

  const oldestTime = Math.min(...syncTimes);
  return new Date(oldestTime).toISOString();
}

/**
 * Formats time ago for display
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
