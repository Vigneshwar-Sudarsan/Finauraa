# Phase 3: API Security - Research

**Researched:** 2026-01-25
**Domain:** OAuth2 token management, admin access control, audit logging
**Confidence:** MEDIUM

## Summary

Phase 3 addresses two critical security requirements: proactive token refresh for Tarabut API calls (SEC-02) and database-controlled admin access with audit logging (SEC-04).

**Current state:** The codebase calls `getAccessToken()` fresh on every API request, which creates new tokens but never checks expiry of stored tokens. The `/api/tarabut/sync/route.ts` has partial token expiry logic that marks connections as "expired" but doesn't trigger refresh. Admin access currently uses environment variable `ADMIN_EMAILS` with fallback to `profiles.is_admin` column check.

**Research findings:** OAuth2 token refresh requires checking expiry BEFORE API calls, handling race conditions for concurrent requests, and storing updated token metadata. Admin access should use dedicated tables with row-level security policies, not environment variables. Audit logging requires trigger-based or application-level tracking with JSONB storage for flexibility.

**Primary recommendation:** Implement a token refresh helper that checks `token_expires_at` with configurable buffer time (5 minutes), refreshes if needed, and uses mutex pattern for concurrent request handling. Create `admin_users` table with RLS policies and migrate from environment variable. Extend existing `audit_logs` table to track admin operations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| crypto.timingSafeEqual | Node.js built-in | Constant-time comparison | Prevents timing attacks on token validation (already used in Phase 2) |
| async-mutex | ^0.5.0 | Mutex for concurrent operations | Industry standard for preventing token refresh race conditions |
| PostgreSQL JSONB | Built-in | Flexible audit log storage | Modern audit systems use JSONB for schema-free metadata storage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase RLS | Built-in | Row-level security | Already in use; extend for admin table access control |
| Database triggers | PostgreSQL | Automatic audit logging | Alternative to application-level logging (NOT recommended for this codebase) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| async-mutex | Manual promise queue | Mutex is battle-tested, manual queue is error-prone |
| Application logging | pgAudit extension | pgAudit requires PostgreSQL config changes (not available in Supabase) |
| JSONB storage | Separate columns per field | JSONB provides flexibility for evolving audit requirements |

**Installation:**
```bash
npm install async-mutex
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── tarabut/
│   ├── client.ts           # Existing Tarabut client
│   └── token-manager.ts    # NEW: Token refresh logic with expiry checking
├── admin/
│   ├── access-control.ts   # NEW: Admin check + audit logging
│   └── middleware.ts       # NEW: Admin-only API route wrapper
└── audit.ts                # EXISTING: Extend with admin action types
```

### Pattern 1: Proactive Token Refresh with Expiry Check
**What:** Check token expiry before making API calls and refresh if within buffer window
**When to use:** Every Tarabut API call that uses stored tokens
**Implementation:**

```typescript
// lib/tarabut/token-manager.ts
import { Mutex } from 'async-mutex';

interface TokenRefreshResult {
  accessToken: string;
  shouldUpdate: boolean; // true if token was refreshed
  expiresAt: Date;
}

class TarabutTokenManager {
  private refreshMutexes: Map<string, Mutex> = new Map();
  private bufferMinutes: number = 5; // Refresh if token expires within 5 minutes

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
        expiresAt
      };
    }

    // Use mutex to prevent concurrent refresh for same user
    const mutex = this.getUserMutex(userId);
    return await mutex.runExclusive(async () => {
      // Double-check after acquiring lock (another request might have refreshed)
      const freshConnection = await this.getConnectionFromDB(userId);
      const freshExpiry = new Date(freshConnection.token_expires_at);
      const freshBufferTime = new Date(now.getTime() + this.bufferMinutes * 60 * 1000);

      if (freshExpiry > freshBufferTime) {
        // Another request already refreshed
        return {
          accessToken: freshConnection.access_token,
          shouldUpdate: false,
          expiresAt: freshExpiry
        };
      }

      // Perform refresh
      const client = createTarabutClient();
      const tokenResponse = await client.getAccessToken(userId);

      return {
        accessToken: tokenResponse.accessToken,
        shouldUpdate: true,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000)
      };
    });
  }

  private getUserMutex(userId: string): Mutex {
    if (!this.refreshMutexes.has(userId)) {
      this.refreshMutexes.set(userId, new Mutex());
    }
    return this.refreshMutexes.get(userId)!;
  }
}

export const tokenManager = new TarabutTokenManager();
```

**Usage in API routes:**
```typescript
// app/api/finance/refresh/route.ts (modified)
export async function POST() {
  const connection = await getConnection(user.id);

  // NEW: Check and refresh if needed
  const tokenResult = await tokenManager.getValidToken(user.id, connection);

  if (tokenResult.shouldUpdate) {
    // Update database with new token
    await supabase
      .from("bank_connections")
      .update({
        access_token: tokenResult.accessToken,
        token_expires_at: tokenResult.expiresAt.toISOString(),
      })
      .eq("id", connection.id);
  }

  // Use validated token
  const accounts = await client.getAccounts(tokenResult.accessToken);
  // ... rest of logic
}
```

### Pattern 2: Database-Controlled Admin Access
**What:** Store admin privileges in database table with audit logging, not environment variables
**When to use:** All admin API routes
**Implementation:**

```typescript
// Database schema (to be created in migration)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id), -- who granted admin
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  reason TEXT, -- why they were granted admin
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id)
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id) WHERE is_active = true;

-- RLS policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin list (self-referential)
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );
```

```typescript
// lib/admin/access-control.ts
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

export async function checkAdminAccess(userId: string): Promise<{
  isAdmin: boolean;
  adminId?: string;
}> {
  const supabase = await createClient();

  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id, user_id, granted_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  return {
    isAdmin: !!adminRecord,
    adminId: adminRecord?.id
  };
}

export async function requireAdmin(
  requestPath: string
): Promise<{ userId: string; adminId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isAdmin, adminId } = await checkAdminAccess(user.id);

  if (!isAdmin) {
    // Log unauthorized admin access attempt
    await logAuditEvent({
      userId: user.id,
      actionType: "data_access",
      resourceType: "admin",
      performedBy: "user",
      requestPath,
      responseStatus: 403,
      metadata: { reason: "not_admin" }
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Log successful admin access
  await logAuditEvent({
    userId: user.id,
    actionType: "data_access",
    resourceType: "admin",
    performedBy: "admin",
    requestPath,
    responseStatus: 200,
    metadata: { admin_id: adminId }
  });

  return { userId: user.id, adminId: adminId! };
}
```

**Usage in admin API routes:**
```typescript
// app/api/admin/feature-flags/route.ts (modified)
import { requireAdmin } from "@/lib/admin/access-control";

export async function GET() {
  const result = await requireAdmin("/api/admin/feature-flags");

  if (result instanceof NextResponse) {
    return result; // Early return with error response
  }

  const { userId, adminId } = result;

  // Admin-only logic here
  const { data: flags } = await supabase.from("feature_flags").select("*");

  return NextResponse.json({ flags });
}
```

### Pattern 3: Admin Action Audit Logging
**What:** Log all admin operations with before/after state
**When to use:** All admin mutations (create, update, delete operations)
**Implementation:**

```typescript
// lib/audit.ts (extend existing)
export type AuditActionType =
  | "data_access"
  // ... existing types
  | "admin_action"        // NEW
  | "admin_grant"         // NEW
  | "admin_revoke";       // NEW

export type AuditResourceType =
  | "profile"
  // ... existing types
  | "admin"               // NEW
  | "feature_flag";       // NEW

export async function logAdminAction(
  adminId: string,
  actionType: "admin_action" | "admin_grant" | "admin_revoke",
  resourceType: AuditResourceType,
  resourceId: string,
  details: {
    action: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  }
): Promise<string | null> {
  return logAuditEvent({
    userId: adminId,
    actionType,
    resourceType,
    resourceId,
    performedBy: "admin",
    metadata: details
  });
}
```

**Usage:**
```typescript
// app/api/admin/feature-flags/route.ts (PUT method)
export async function PUT(request: NextRequest) {
  const result = await requireAdmin("/api/admin/feature-flags");
  if (result instanceof NextResponse) return result;

  const { adminId } = result;
  const body = await request.json();

  // Fetch before state
  const { data: beforeState } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("id", body.id)
    .single();

  // Perform update
  const { data: afterState } = await supabase
    .from("feature_flags")
    .update(body)
    .eq("id", body.id)
    .select()
    .single();

  // Log admin action
  await logAdminAction(
    adminId,
    "admin_action",
    "feature_flag",
    body.id,
    {
      action: "update_feature_flag",
      before: beforeState || undefined,
      after: afterState || undefined
    }
  );

  return NextResponse.json({ success: true });
}
```

### Anti-Patterns to Avoid

- **Refreshing tokens on every request:** Creates unnecessary API calls. Check expiry first.
- **No buffer time for token refresh:** Checking `expires_at === now()` means racing against time. Use 5+ minute buffer.
- **Race conditions on concurrent refresh:** Multiple requests refreshing simultaneously causes wasted calls and potential errors. Use mutex.
- **Environment variable admin access:** Cannot be changed without deployment. Use database table.
- **Audit logging in database triggers:** Application-level logging provides better context and error handling.
- **Comparing tokens with `===` operator:** Vulnerable to timing attacks. Use `crypto.timingSafeEqual()` for sensitive comparisons.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent token refresh locking | Custom promise queue | `async-mutex` package | Battle-tested, handles edge cases like deadlocks and stale locks |
| Token expiry calculation | Manual date math with buffers | Standardized helper with configurable buffer | Easy to get timezone/buffer logic wrong |
| Admin access middleware | Custom auth checks in every route | Reusable `requireAdmin()` function | DRY principle, consistent audit logging |
| Audit log schema changes | ALTER TABLE per new field | JSONB metadata column | Adding new audit fields shouldn't require migrations |
| Timing-safe string comparison | Custom byte-by-byte loop | `crypto.timingSafeEqual()` | Already implemented in Phase 2, reuse pattern |

**Key insight:** Token refresh race conditions are subtle. A naive implementation might refresh twice, invalidating the first token. The mutex pattern prevents this by ensuring only one refresh happens at a time per user.

## Common Pitfalls

### Pitfall 1: Token Expiry Check After API Call Fails
**What goes wrong:** Code calls Tarabut API, gets 401 error, then checks expiry and retries
**Why it happens:** Reactive approach seems simpler than proactive checking
**How to avoid:** Always check `token_expires_at` with buffer BEFORE calling external API
**Warning signs:**
- Frequent 401 errors in Sentry logs
- API routes with try/catch blocks that retry on 401
- Token refresh logic only in error handlers

**Pattern:**
```typescript
// BAD: Reactive
try {
  const data = await client.getAccounts(token);
} catch (error) {
  if (error.status === 401) {
    const newToken = await refresh();
    const data = await client.getAccounts(newToken);
  }
}

// GOOD: Proactive
const validToken = await tokenManager.getValidToken(userId, connection);
if (validToken.shouldUpdate) {
  await updateTokenInDB(validToken);
}
const data = await client.getAccounts(validToken.accessToken);
```

### Pitfall 2: No Buffer Time for Token Refresh
**What goes wrong:** Token expires during API call even though it was valid at check time
**Why it happens:** API calls take time, network delays occur, tokens expire exactly at stored timestamp
**How to avoid:** Use buffer window (5+ minutes). Refresh if token expires within buffer time.
**Warning signs:**
- Intermittent 401 errors that "shouldn't happen"
- More failures during slow network conditions
- Failures correlating with long-running API operations

**Buffer calculation:**
```typescript
// BAD: No buffer
const expiresAt = new Date(connection.token_expires_at);
const needsRefresh = expiresAt <= new Date();

// GOOD: 5-minute buffer
const expiresAt = new Date(connection.token_expires_at);
const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
const needsRefresh = expiresAt <= bufferTime;
```

### Pitfall 3: Race Condition on Concurrent Token Refresh
**What goes wrong:** User makes 3 API calls simultaneously, each checks token expiry, all 3 refresh, causing errors
**Why it happens:** No synchronization between concurrent requests for same user
**How to avoid:** Use mutex per user to ensure only one refresh at a time
**Warning signs:**
- Multiple `getAccessToken()` calls for same user in logs at same timestamp
- Token refresh errors increase with traffic
- Duplicate refresh attempts visible in external API logs (Tarabut side)

**Detection:**
```typescript
// Add logging to detect this
console.log(`[${userId}] Token refresh started at ${new Date().toISOString()}`);
const token = await client.getAccessToken(userId);
console.log(`[${userId}] Token refresh completed at ${new Date().toISOString()}`);

// If you see multiple "started" before any "completed", you have a race condition
```

### Pitfall 4: Environment Variable Admin Access Cannot Be Revoked
**What goes wrong:** Admin needs to be revoked but requires deployment to change .env file
**Why it happens:** Admin access stored in immutable environment variable
**How to avoid:** Use database table with `is_active` flag for instant revocation
**Warning signs:**
- Admin access changes require deployments
- No audit trail of admin grants/revocations
- Cannot answer "who was admin on date X?"

**Migration path:**
```typescript
// PHASE 1: Add database check (additive, no breaking change)
async function isAdmin(supabase, user) {
  // Keep env var check as fallback during migration
  const envAdmins = process.env.ADMIN_EMAILS?.split(",") || [];
  if (envAdmins.includes(user.email)) {
    return true;
  }

  // NEW: Database check
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return !!data;
}

// PHASE 2: Remove env var check (after all admins in database)
async function isAdmin(supabase, user) {
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return !!data;
}
```

### Pitfall 5: Missing Token Update After Refresh
**What goes wrong:** Token refreshed successfully but database still has old expiry timestamp
**Why it happens:** Forgot to update `bank_connections.token_expires_at` after refresh
**How to avoid:** Token refresh function should return "shouldUpdate" flag and caller must persist
**Warning signs:**
- Token refreshes every request even though it shouldn't be expired
- `token_expires_at` shows old date in database
- Refresh logic executes but expiry check still fails next request

**Correct flow:**
```typescript
const tokenResult = await tokenManager.getValidToken(userId, connection);

if (tokenResult.shouldUpdate) {
  // CRITICAL: Must update database
  await supabase
    .from("bank_connections")
    .update({
      access_token: tokenResult.accessToken,
      token_expires_at: tokenResult.expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", connection.id);
}
```

### Pitfall 6: Audit Logs Without Before/After State
**What goes wrong:** Admin changes something, audit log says "updated feature_flag" but doesn't show what changed
**Why it happens:** Only logging action, not the state change
**How to avoid:** Fetch record before update, include both states in audit metadata
**Warning signs:**
- Cannot answer "what was the value before admin changed it?"
- Audit logs only show action happened, not what changed
- Need to reconstruct state from multiple operations

**Comprehensive audit:**
```typescript
// Fetch before
const { data: before } = await supabase.from("table").select("*").eq("id", id).single();

// Perform change
const { data: after } = await supabase.from("table").update(changes).eq("id", id).select().single();

// Log with before/after
await logAdminAction(adminId, "admin_action", "resource", id, {
  action: "update_record",
  before,
  after,
  changes: Object.keys(changes) // which fields changed
});
```

## Code Examples

Verified patterns from research:

### Token Expiry Check Before API Call
```typescript
// Source: OAuth 2.0 best practices (synthesized from research)
async function callTarabutAPI(userId: string) {
  // 1. Get connection with token metadata
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("id, access_token, token_expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!connection) {
    throw new Error("No active connection");
  }

  // 2. Check expiry with buffer
  const expiresAt = new Date(connection.token_expires_at);
  const bufferMinutes = 5;
  const bufferTime = new Date(Date.now() + bufferMinutes * 60 * 1000);

  let accessToken = connection.access_token;

  if (expiresAt <= bufferTime) {
    // 3. Refresh token
    const client = createTarabutClient();
    const tokenResponse = await client.getAccessToken(userId);

    // 4. Update database
    await supabase
      .from("bank_connections")
      .update({
        access_token: tokenResponse.accessToken,
        token_expires_at: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
      })
      .eq("id", connection.id);

    accessToken = tokenResponse.accessToken;
  }

  // 5. Use validated token
  return await client.getAccounts(accessToken);
}
```

### Mutex-Based Token Refresh
```typescript
// Source: async-mutex package + OAuth2 race condition research
import { Mutex } from 'async-mutex';

class TokenRefreshManager {
  private mutexes = new Map<string, Mutex>();

  async refreshIfNeeded(userId: string): Promise<string> {
    // Get or create mutex for this user
    if (!this.mutexes.has(userId)) {
      this.mutexes.set(userId, new Mutex());
    }
    const mutex = this.mutexes.get(userId)!;

    // Only one refresh at a time per user
    return await mutex.runExclusive(async () => {
      // Double-check after acquiring lock
      const connection = await this.getConnection(userId);
      const expiresAt = new Date(connection.token_expires_at);
      const bufferTime = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt > bufferTime) {
        // Another concurrent request already refreshed
        return connection.access_token;
      }

      // Perform refresh
      const client = createTarabutClient();
      const tokenResponse = await client.getAccessToken(userId);

      // Update database
      await this.updateToken(userId, {
        accessToken: tokenResponse.accessToken,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000)
      });

      return tokenResponse.accessToken;
    });
  }
}

export const tokenRefreshManager = new TokenRefreshManager();
```

### Admin Access Check with RLS
```typescript
// Source: Supabase RLS patterns + PostgreSQL role-based access control
-- Database migration
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id)
);

-- Self-referential RLS: only admins can see admin list
CREATE POLICY "Admins view admins"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

-- Application code
async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS policy ensures only admins can query this
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!adminRecord) {
    await logAuditEvent({
      userId: user.id,
      actionType: "data_access",
      resourceType: "admin",
      metadata: { reason: "not_admin", attempted_access: true }
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: user.id };
}
```

### Audit Logging with Before/After State
```typescript
// Source: PostgreSQL audit logging best practices
export async function logAdminAction(
  adminId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const changes = Object.keys(after).reduce((acc, key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      acc[key] = { before: before[key], after: after[key] };
    }
    return acc;
  }, {} as Record<string, { before: unknown; after: unknown }>);

  await supabase.from("audit_logs").insert({
    user_id: adminId,
    action_type: "admin_action",
    resource_type: resourceType,
    resource_id: resourceId,
    performed_by: "admin",
    metadata: {
      action,
      changes,
      fields_modified: Object.keys(changes)
    }
  });
}

// Usage
const before = await fetchRecord(id);
const after = await updateRecord(id, changes);
await logAdminAction(adminId, "feature_flag", id, "update", before, after);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Check expiry after 401 error | Check expiry before API call | OAuth 2.1 (2023-2026) | Reduces failed requests, better UX |
| No concurrency control | Mutex per user for refresh | 2024-2025 best practices | Prevents race conditions |
| Long-lived tokens (hours) | Short tokens + proactive refresh | Security hardening 2023+ | Reduces blast radius of token theft |
| Environment variable admins | Database-controlled access | RBAC evolution | Instant revocation, audit trail |
| Manual expiry calculations | Buffer-based refresh triggers | Developer experience | Fewer edge cases with time math |
| Trigger-based audit logs | Application-level logging | Modern audit standards | Better context, easier debugging |

**Deprecated/outdated:**
- **Reactive token refresh (401 retry pattern):** Wastes API calls and creates poor UX. Proactive checking is now standard.
- **Environment variable secrets for admin access:** Cannot be changed dynamically. Database tables are now standard.
- **Manual concurrency handling:** async-mutex is battle-tested. Don't build custom locking.

## Open Questions

Things that couldn't be fully resolved:

1. **Tarabut Gateway Token Refresh Endpoint**
   - What we know: Tarabut client has `getAccessToken()` which returns new token with expiry
   - What's unclear: Does Tarabut support proper OAuth2 refresh tokens, or does it issue new tokens each time?
   - Recommendation: Current `getAccessToken(userId)` approach works. Document in code that this is Tarabut's pattern (not traditional refresh_token flow).

2. **Token Refresh Buffer Time**
   - What we know: 5-minute buffer is industry standard for access tokens with 1-hour lifetime
   - What's unclear: What is Tarabut's actual token lifetime? Is 5 minutes appropriate?
   - Recommendation: Start with 5 minutes, make it configurable, monitor refresh frequency in production.

3. **Mutex Cleanup**
   - What we know: In-memory Map of mutexes per user could grow indefinitely
   - What's unclear: When/how to clean up unused mutexes (LRU, TTL, etc.)?
   - Recommendation: Implement simple TTL-based cleanup (remove mutex if unused for 1 hour). Not critical for v1.

4. **Admin User Bootstrap**
   - What we know: Need database table, but first admin can't grant themselves access
   - What's unclear: How to create first admin user?
   - Recommendation: Migration script that reads ADMIN_EMAILS and populates admin_users table. Then remove env var.

5. **Audit Log Retention**
   - What we know: Audit logs should be retained for compliance
   - What's unclear: Retention period for Bahrain (PDPL compliance)?
   - Recommendation: Start with 2 years retention (common compliance standard). Add database cleanup job.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - Official RLS patterns
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - Admin access patterns
- [Node.js crypto.timingSafeEqual](https://docs.deno.com/api/node/crypto/~/timingSafeEqual) - Timing-safe comparison
- [async-mutex npm package](https://www.npmjs.com/package/async-mutex) - Mutex implementation

### Secondary (MEDIUM confidence)
- [OAuth 2 Refresh Tokens: A Practical Guide | Frontegg](https://frontegg.com/blog/oauth-2-refresh-tokens) - Token refresh patterns
- [OAuth 2.0 Refresh Token Best Practices • Stateful](https://stateful.com/blog/oauth-refresh-token-best-practices) - Buffer time recommendations
- [PostgreSQL Audit Logging Best Practices | Severalnines](https://severalnines.com/blog/postgresql-audit-logging-best-practices/) - Audit table design
- [Let's Build Production-Ready Audit Logs in PostgreSQL | Medium](https://medium.com/@sehban.alam/lets-build-production-ready-audit-logs-in-postgresql-7125481713d8) - JSONB patterns
- [Refresh Token Race Condition - Apideck](https://developers.apideck.com/guides/refresh-token-race-condition) - Concurrency issues
- [Common Pitfalls in Authentication Token Renewal | Brains & Beards](https://brainsandbeards.com/blog/2024-token-renewal-mutex/) - Mutex pattern

### Tertiary (LOW confidence)
- [Tarabut Gateway Bank Coverage](https://www.openbankingtracker.com/api-aggregators/tarabutgateway) - Limited technical details
- [WebSearch results on Open Banking token patterns](https://dashdevs.com/blog/open-banking-in-the-middle-east-developing-a-digital-open-banking-platform/) - General context only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - async-mutex is industry standard, crypto.timingSafeEqual already in use
- Architecture: MEDIUM - Patterns synthesized from multiple sources, not Tarabut-specific docs
- Pitfalls: HIGH - Well-documented issues in OAuth2/token management literature
- Admin access: HIGH - PostgreSQL RLS is well-established, Supabase docs are authoritative
- Audit logging: MEDIUM - General best practices, not fintech-specific requirements

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - OAuth2 patterns are stable, but Open Banking specifics may evolve)

**Key unknowns:**
- Tarabut Gateway specific token lifetime (assumed 1 hour based on industry standard)
- PDPL-specific audit retention requirements (assumed 2 years based on GDPR/compliance standards)
- Tarabut's exact refresh token implementation (current client suggests it issues new tokens, not refresh_token flow)

**Next steps for planner:**
- Verify Tarabut token lifetime with actual response inspection
- Confirm PDPL audit retention requirements with legal/compliance
- Test mutex pattern with concurrent requests in development environment
