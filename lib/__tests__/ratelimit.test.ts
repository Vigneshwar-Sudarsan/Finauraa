/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock Supabase - will be configured per test
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('ratelimit', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to get fresh rate limiter instance

    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    // Reset mock supabase client
    mockSupabaseClient.from = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fail-closed behavior', () => {
    it('blocks requests when Supabase unavailable', async () => {
      // Mock Supabase to throw error
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database unavailable'),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user';
      const type = 'api';

      // Make requests up to fallback limit (10 for api type)
      const results = [];
      for (let i = 0; i < 11; i++) {
        const result = await checkRateLimit(type, userId);
        results.push(result);
      }

      // First 10 should succeed (at limit)
      for (let i = 0; i < 10; i++) {
        expect(results[i]).toBeNull();
      }

      // 11th should be rate limited
      expect(results[10]).not.toBeNull();
      if (results[10]) {
        const response = results[10] as Response;
        expect(response.status).toBe(429);
      }
    });

    it('uses stricter limits during fallback', async () => {
      // Mock Supabase to throw error
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database unavailable'),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user-2';
      const type = 'api';

      // Fallback limit is 10/min (vs 60/min normal)
      const results = [];
      for (let i = 0; i < 11; i++) {
        const result = await checkRateLimit(type, userId);
        results.push(result);
      }

      // Verify limit is 10, not 60
      const limitedResponse = results[10] as Response;
      expect(limitedResponse).not.toBeNull();
      expect(limitedResponse.status).toBe(429);

      const responseData = await limitedResponse.json();
      expect(responseData.error).toBe('Too many requests. Please try again later.');
      expect(responseData.retryAfter).toBeGreaterThan(0);
    });

    it('returns 429 when rate limited in memory', async () => {
      // Mock Supabase to throw error
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database unavailable'),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user-3';
      const type = 'api';

      // Exhaust fallback limit
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(type, userId);
      }

      // Next request should be rate limited
      const result = await checkRateLimit(type, userId);
      expect(result).not.toBeNull();

      if (result) {
        const response = result as Response;
        expect(response.status).toBe(429);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('retryAfter');
        expect(data.retryAfter).toBeGreaterThan(0);

        const headers = Object.fromEntries(response.headers.entries());
        expect(headers['x-ratelimit-limit']).toBe('10');
        expect(headers['x-ratelimit-remaining']).toBe('0');
        expect(headers['x-ratelimit-fallback']).toBe('true');
      }
    });

    it('logs to Sentry when falling back to memory', async () => {
      // Mock Supabase to throw error
      const dbError = new Error('Connection timeout');
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: dbError,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user-4';
      const type = 'auth';

      await checkRateLimit(type, userId);

      // Verify Sentry was called with the error
      expect(Sentry.captureException).toHaveBeenCalled();
      const call = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(call[0]).toBe(dbError);
      expect(call[1]).toMatchObject({
        tags: {
          component: 'rate_limiter',
          failure_mode: 'database_unavailable',
          rate_limit_type: type,
        },
        contexts: {
          infrastructure: {
            fallback_active: true,
            service: 'supabase',
            user_id: userId,
          },
        },
      });
    });
  });

  describe('database-backed behavior', () => {
    it('allows request when under database limit', async () => {
      // Mock successful Supabase response
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: '1', count: 5, window_start: new Date().toISOString() }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: mockUpdate,
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user-5';
      const type = 'api';

      const result = await checkRateLimit(type, userId);

      expect(result).toBeNull(); // Allowed
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('blocks request when over database limit', async () => {
      // Import config first
      const { rateLimitConfigs } = await import('../ratelimit');
      const config = rateLimitConfigs['api'];

      // Mock Supabase response with count at limit
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{
                      id: '1',
                      count: config.maxRequests,
                      window_start: new Date().toISOString()
                    }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Import fresh module
      const { checkRateLimit } = await import('../ratelimit');

      const userId = 'test-user-6';
      const type = 'api';

      const result = await checkRateLimit(type, userId);

      expect(result).not.toBeNull();
      if (result) {
        const response = result as Response;
        expect(response.status).toBe(429);

        const data = await response.json();
        expect(data.error).toBe('Too many requests. Please try again later.');

        const headers = Object.fromEntries(response.headers.entries());
        expect(headers['x-ratelimit-limit']).toBe(config.maxRequests.toString());
        expect(headers['x-ratelimit-remaining']).toBe('0');
      }
    });
  });
});
