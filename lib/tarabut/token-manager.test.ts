/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TarabutTokenManager } from './token-manager';
import type { TarabutTokenResponse } from './client';

// Mock the Tarabut client
const mockGetAccessToken = vi.fn<[string?], Promise<TarabutTokenResponse>>();
vi.mock('./client', () => ({
  createTarabutClient: () => ({
    getAccessToken: mockGetAccessToken,
  }),
}));

describe('TarabutTokenManager', () => {
  let tokenManager: TarabutTokenManager;

  beforeEach(() => {
    tokenManager = new TarabutTokenManager();
    mockGetAccessToken.mockClear();
  });

  describe('getValidToken', () => {
    it('returns existing token when it expires in 30 minutes (no refresh needed)', async () => {
      const futureExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const connection = {
        access_token: 'existing-token',
        token_expires_at: futureExpiry.toISOString(),
      };

      const result = await tokenManager.getValidToken('user-123', connection);

      expect(result.accessToken).toBe('existing-token');
      expect(result.shouldUpdate).toBe(false);
      expect(result.expiresAt).toEqual(futureExpiry);
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes token when it expires in 3 minutes (within buffer window)', async () => {
      const nearExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      const connection = {
        access_token: 'old-token',
        token_expires_at: nearExpiry.toISOString(),
      };

      mockGetAccessToken.mockResolvedValue({
        accessToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: 3600, // 1 hour
      });

      const result = await tokenManager.getValidToken('user-123', connection);

      expect(result.accessToken).toBe('new-token');
      expect(result.shouldUpdate).toBe(true);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(mockGetAccessToken).toHaveBeenCalledWith('user-123');
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it('refreshes token when it is already expired', async () => {
      const pastExpiry = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const connection = {
        access_token: 'expired-token',
        token_expires_at: pastExpiry.toISOString(),
      };

      mockGetAccessToken.mockResolvedValue({
        accessToken: 'refreshed-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      const result = await tokenManager.getValidToken('user-123', connection);

      expect(result.accessToken).toBe('refreshed-token');
      expect(result.shouldUpdate).toBe(true);
      expect(mockGetAccessToken).toHaveBeenCalledWith('user-123');
    });

    it('handles concurrent requests for same user with mutex (only one refresh)', async () => {
      const nearExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      const connection = {
        access_token: 'old-token',
        token_expires_at: nearExpiry.toISOString(),
      };

      let refreshCount = 0;
      mockGetAccessToken.mockImplementation(async () => {
        refreshCount++;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          accessToken: 'new-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        };
      });

      // Make 3 concurrent requests for same user
      const results = await Promise.all([
        tokenManager.getValidToken('user-123', connection),
        tokenManager.getValidToken('user-123', connection),
        tokenManager.getValidToken('user-123', connection),
      ]);

      // First call refreshes, others see recent refresh and skip
      expect(results[0].accessToken).toBe('new-token');
      expect(results[0].shouldUpdate).toBe(true);

      // Subsequent calls detect recent refresh (< 10 sec) and return without re-refresh
      expect(results[1].shouldUpdate).toBe(false);
      expect(results[2].shouldUpdate).toBe(false);

      // But refresh should only happen once due to mutex + double-check
      expect(refreshCount).toBe(1);
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it('allows concurrent requests for different users to refresh in parallel', async () => {
      const nearExpiry = new Date(Date.now() + 2 * 60 * 1000);
      const connection1 = {
        access_token: 'token-1',
        token_expires_at: nearExpiry.toISOString(),
      };
      const connection2 = {
        access_token: 'token-2',
        token_expires_at: nearExpiry.toISOString(),
      };

      mockGetAccessToken.mockImplementation(async (userId) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          accessToken: `new-token-${userId}`,
          tokenType: 'Bearer',
          expiresIn: 3600,
        };
      });

      const results = await Promise.all([
        tokenManager.getValidToken('user-1', connection1),
        tokenManager.getValidToken('user-2', connection2),
      ]);

      expect(results[0].accessToken).toBe('new-token-user-1');
      expect(results[1].accessToken).toBe('new-token-user-2');
      expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    });

    it('uses configurable buffer time (default 5 minutes)', async () => {
      // Token expires exactly at 5 minutes - should trigger refresh
      const exactBufferExpiry = new Date(Date.now() + 5 * 60 * 1000);
      const connection = {
        access_token: 'old-token',
        token_expires_at: exactBufferExpiry.toISOString(),
      };

      mockGetAccessToken.mockResolvedValue({
        accessToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      const result = await tokenManager.getValidToken('user-123', connection);

      expect(result.shouldUpdate).toBe(true);
      expect(mockGetAccessToken).toHaveBeenCalled();
    });

    it('does not refresh when token expires just after buffer window', async () => {
      // Token expires at 5 minutes + 1 second - should NOT trigger refresh
      const justAfterBuffer = new Date(Date.now() + (5 * 60 + 1) * 1000);
      const connection = {
        access_token: 'current-token',
        token_expires_at: justAfterBuffer.toISOString(),
      };

      const result = await tokenManager.getValidToken('user-123', connection);

      expect(result.accessToken).toBe('current-token');
      expect(result.shouldUpdate).toBe(false);
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('custom buffer time', () => {
    it('respects custom buffer time configuration', async () => {
      const customTokenManager = new TarabutTokenManager({ bufferMinutes: 10 });

      // Token expires in 8 minutes - within 10 minute buffer, should refresh
      const expiry = new Date(Date.now() + 8 * 60 * 1000);
      const connection = {
        access_token: 'old-token',
        token_expires_at: expiry.toISOString(),
      };

      mockGetAccessToken.mockResolvedValue({
        accessToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      const result = await customTokenManager.getValidToken('user-123', connection);

      expect(result.shouldUpdate).toBe(true);
      expect(mockGetAccessToken).toHaveBeenCalled();
    });
  });
});
