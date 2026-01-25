/**
 * Tarabut Token Manager
 *
 * Handles proactive token refresh with expiry checking and mutex-based concurrency control.
 *
 * Purpose: Prevents 401 errors by checking token expiry BEFORE API calls and refreshing
 * tokens within a configurable buffer window (default: 5 minutes).
 *
 * Key features:
 * - Proactive expiry check with buffer time (default 5 min)
 * - Mutex per user prevents concurrent refresh race conditions
 * - Returns { accessToken, shouldUpdate, expiresAt } - caller must persist if shouldUpdate=true
 *
 * @see .planning/phases/03-api-security/03-RESEARCH.md for token refresh patterns
 */

import { Mutex } from 'async-mutex';
import { createTarabutClient } from './client';

export interface TokenRefreshResult {
  accessToken: string;
  shouldUpdate: boolean; // true if token was refreshed, caller must update database
  expiresAt: Date;
}

export interface TokenManagerOptions {
  bufferMinutes?: number; // Refresh if token expires within this window (default: 5)
}

export class TarabutTokenManager {
  private refreshMutexes: Map<string, Mutex> = new Map();
  private lastRefreshTime: Map<string, number> = new Map();
  private bufferMinutes: number;

  constructor(options: TokenManagerOptions = {}) {
    this.bufferMinutes = options.bufferMinutes ?? 5;
  }

  /**
   * Get valid access token, refreshing if needed
   *
   * @param userId - User ID to refresh token for
   * @param connection - Current connection data with access_token and token_expires_at
   * @returns Token refresh result with shouldUpdate flag
   *
   * @example
   * ```ts
   * const result = await tokenManager.getValidToken(userId, connection);
   *
   * if (result.shouldUpdate) {
   *   await supabase
   *     .from("bank_connections")
   *     .update({
   *       access_token: result.accessToken,
   *       token_expires_at: result.expiresAt.toISOString(),
   *     })
   *     .eq("id", connection.id);
   * }
   *
   * // Use validated token
   * const accounts = await client.getAccounts(result.accessToken);
   * ```
   */
  async getValidToken(
    userId: string,
    connection: { access_token: string; token_expires_at: string }
  ): Promise<TokenRefreshResult> {
    // Check if token needs refresh
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferTime = new Date(now.getTime() + this.bufferMinutes * 60 * 1000);

    const needsRefresh = expiresAt <= bufferTime;

    if (!needsRefresh) {
      return {
        accessToken: connection.access_token,
        shouldUpdate: false,
        expiresAt,
      };
    }

    // Use mutex to prevent concurrent refresh for same user
    const mutex = this.getUserMutex(userId);
    return await mutex.runExclusive(async () => {
      // Double-check pattern: if we just refreshed (< 10 seconds ago),
      // skip refresh since a concurrent request just did it
      const lastRefresh = this.lastRefreshTime.get(userId) || 0;
      const timeSinceRefresh = Date.now() - lastRefresh;

      if (timeSinceRefresh < 10000) {
        // Another concurrent request just refreshed, return existing
        // Note: In production, caller would re-fetch from DB to get updated token
        return {
          accessToken: connection.access_token,
          shouldUpdate: false,
          expiresAt,
        };
      }

      // Perform refresh
      const client = createTarabutClient();
      const tokenResponse = await client.getAccessToken(userId);

      const newExpiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000);

      // Track this refresh
      this.lastRefreshTime.set(userId, Date.now());

      return {
        accessToken: tokenResponse.accessToken,
        shouldUpdate: true,
        expiresAt: newExpiresAt,
      };
    });
  }

  /**
   * Get or create mutex for a user
   * Ensures only one token refresh happens at a time per user
   */
  private getUserMutex(userId: string): Mutex {
    if (!this.refreshMutexes.has(userId)) {
      this.refreshMutexes.set(userId, new Mutex());
    }
    return this.refreshMutexes.get(userId)!;
  }
}

/**
 * Singleton token manager instance with default configuration
 */
export const tokenManager = new TarabutTokenManager();
