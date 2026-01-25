# Coding Conventions

**Analysis Date:** 2026-01-25

## Naming Patterns

**Files:**
- kebab-case for all file names: `chat-message.tsx`, `use-feature-access.ts`, `consent-middleware.ts`
- Component files use `.tsx` extension
- Utility/logic files use `.ts` extension
- Validation schemas use `-validation.ts` or located in `lib/validations/` directory
- Hooks use `use-` prefix: `use-feature-access.ts`, `use-bank-connection.tsx`, `use-mobile.ts`

**Functions:**
- camelCase for all function names
- Component functions use PascalCase (React convention): `ChatMessage()`, `Button()`, `AppSidebar()`
- Utility functions use camelCase: `sanitizeUserInput()`, `formatCurrency()`, `checkRateLimit()`
- Hook functions use camelCase: `useFeatureAccess()`, `useMobile()`
- Private/internal functions may use underscore prefix: `_getSystemPrompt()` (though not always enforced)

**Variables:**
- camelCase for all variables and constants
- UPPERCASE_SNAKE_CASE for true constants/configuration:
  - `TIER_LIMITS` in `lib/features.ts`
  - `FROM_EMAIL` in `lib/email.ts`
  - `HIGH_RISK_PATTERNS` in `lib/ai/sanitize.ts`
  - `MAX_MESSAGE_LENGTH` in `lib/ai/sanitize.ts`
- State variables use camelCase: `subscription`, `usage`, `isLoading`, `error`

**Types:**
- PascalCase for all type/interface names
- Enum values use UPPERCASE_SNAKE_CASE:
  ```typescript
  export type AuditActionType = "data_access" | "data_fetch" | "data_create"
  export type SubscriptionTier = "free" | "pro" | "family"
  ```
- Props interfaces end with `Props`: `ChatMessageProps`, `FeatureAccessHook`
- Input/output types use descriptive names: `CreateConsentInput`, `EmailResult`, `SanitizeResult`

**Directories:**
- kebab-case for all directory names: `ui/`, `chat/`, `spending/`, `dashboard/`, `family/`
- Feature-based organization under `app/`: `app/dashboard/`, `app/auth/`, `app/api/`
- Utility organization: `lib/ai/`, `lib/supabase/`, `lib/validations/`, `lib/stores/`, `lib/constants/`

## Code Style

**Formatting:**
- No explicit formatter detected (no .prettierrc)
- TypeScript strict mode enabled (`tsconfig.json`: `"strict": true`)
- ES2017 target with ESNext modules
- JSX: react-jsx (React 19 compatible)
- Indentation: 2 spaces (inferred from code examples)

**Linting:**
- ESLint with next/core-web-vitals and next/typescript config: `eslint.config.mjs`
- Uses flat config format (ESLint 9+)
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run with: `npm run lint` (configured in package.json as `eslint`)

## Import Organization

**Order:**
1. React/Next imports: `import React from "react"`, `import { NextRequest } from "next/server"`
2. External library imports: `import { z } from "zod"`, `import Anthropic from "@anthropic-ai/sdk"`
3. Internal absolute imports using `@/` alias: `import { cn } from "@/lib/utils"`, `import { ChatMessage } from "@/components/chat/chat-message"`
4. Relative imports (when necessary): `import { RichContent } from "./rich-content"`

**Path Aliases:**
- `@/*` resolves to project root: `@/lib`, `@/components`, `@/app`, `@/hooks`
- Allows clean, project-wide imports without relative paths

**Example:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logConsentEvent } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";
import { createConsentSchema, formatZodError } from "@/lib/validations/consent";
```

## Error Handling

**Patterns:**
- Try-catch blocks for all async operations and error-prone code
- Explicit error type checking: `error instanceof Error ? error.message : "Unknown error"`
- Function-level error handling rather than error boundaries (outside UI layer)
- API routes return NextResponse with status codes: `NextResponse.json({ error: "..." }, { status: 400 })`
- Console.error for server-side error logging
- Validation errors formatted with Zod helper: `formatZodError(error)` returns structured error object

**Pattern Example from `app/api/consents/route.ts`:**
```typescript
try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit("consent", user.id);
  if (rateLimitResponse) return rateLimitResponse;

  // ... logic
} catch (error) {
  console.error("Consents GET error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

## Logging

**Framework:** console (console.log, console.error)

**Patterns:**
- `console.error()` for errors: `console.error("Failed to send email:", error)`
- `console.log()` for warnings/info: `console.log("RESEND_API_KEY not configured, skipping email")`
- Structured logging with context: Include operation name and user ID when relevant
- Security event logging via `logSecurityEvent()` in `lib/ai/sanitize.ts`
- Audit trail via `logConsentEvent()` in `lib/audit.ts`

**Examples:**
```typescript
// Error logging
console.error("Failed to send consent expiry email:", error);
console.error("Consents GET error:", error);

// Info logging
console.log("RESEND_API_KEY not configured, skipping email");

// Conditional logging (when email key not set)
if (!process.env.RESEND_API_KEY) {
  console.log("RESEND_API_KEY not configured, skipping email");
  return { success: false, error: "Email service not configured" };
}
```

## Comments

**When to Comment:**
- Block comments for major sections and algorithm explanations
- Inline comments for non-obvious logic or workarounds
- JSDoc comments for all public functions, types, and exports
- Comments for PDPL/BOBF compliance requirements and security implications

**JSDoc/TSDoc:**
- Used extensively for functions and types
- Format: `/** comment text */` on line(s) before function
- Include description, parameter explanations, and return type notes

**Pattern from codebase:**
```typescript
/**
 * GET /api/consents
 * List all consents for the authenticated user
 * PDPL Requirement: Users must be able to view their consents
 */
export async function GET(request: NextRequest) {
  // ...
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): SanitizeResult {
  // ...
}

/**
 * Email Notification Service
 * Uses Resend for transactional emails
 */
```

## Function Design

**Size:** Functions kept reasonably small (most 20-50 lines)

**Parameters:**
- Use object/destructuring for multiple parameters
- Typed parameters with explicit types
- Optional parameters clearly marked with `?`

**Return Values:**
- Explicit return types declared
- Result objects for success/failure: `{ success: boolean; data?: T; error?: string }`
- Validation returns discriminated union: `{ success: true; data: T } | { success: false; error: ZodError }`

**Examples:**
```typescript
// Simple parameters
export function formatCurrency(amount: number, currency: string = "BHD"): string {
  // ...
}

// Destructured parameters
export function ChatMessage({ message, onAction }: ChatMessageProps) {
  // ...
}

// Result object return
export async function sendConsentExpiryWarning(
  email: string,
  userName: string,
  consentType: string,
  providerName: string | null,
  expiresAt: string
): Promise<EmailResult> {
  // Returns { success: true; id?: string } | { success: false; error?: string }
}

// Discriminated union return
export function validateRequestBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  // ...
}
```

## Module Design

**Exports:**
- Named exports for functions and types (preferred)
- Default exports used for React components in some cases
- Re-exports for convenience in barrel files

**Examples:**
```typescript
// lib/email.ts - named exports
export interface EmailResult { ... }
export async function sendConsentExpiryWarning(...): Promise<EmailResult> { ... }
export async function sendWelcomeEmail(...): Promise<EmailResult> { ... }

// components/ui/button.tsx - named export + CVA variant export
export { Button, buttonVariants }

// lib/validations/consent.ts - multiple named exports
export const createConsentSchema = z.object({ ... })
export const validateRequestBody = function(...) { ... }
export type CreateConsentInput = z.infer<typeof createConsentSchema>
```

**Barrel Files:**
- Present in `components/ui/` for component re-exports
- Used in validation modules to group related schemas

## Async/Await

**Pattern:** Async functions always used for server operations

```typescript
// Server component/route
async function getCookie() {
  return (await cookies()).get("name")?.value;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Client hook with async fetch
const fetchSubscription = useCallback(async () => {
  try {
    const response = await fetch("/api/subscription");
    // ...
  } catch (error) {
    // ...
  }
}, []);
```

## Hooks and React Patterns

**Client vs Server:**
- `"use client"` directive used in client-side files: hooks, client components
- Server components preferred for data fetching
- Middleware for auth updates

**Hook Patterns:**
- `useState` for local state
- `useCallback` for memoized callbacks
- `useEffect` for side effects
- Custom hooks prefixed with `use-`: `useFeatureAccess()`, `useMobile()`

---

*Convention analysis: 2026-01-25*
