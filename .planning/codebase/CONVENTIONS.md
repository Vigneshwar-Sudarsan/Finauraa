# Coding Conventions

**Analysis Date:** 2026-01-25

## Naming Patterns

**Files:**
- Component files (React): PascalCase with `.tsx` extension. Example: `ChatMessage.tsx`, `AppSidebar.tsx`
- Utility/hook files: kebab-case with `.ts` or `.tsx` extension. Example: `use-api-call.ts`, `use-mobile.ts`, `chat-message.tsx`
- API route handlers: `route.ts` in directory structure reflecting endpoint. Example: `app/api/finance/accounts/route.ts`
- UI primitive components: lowercase kebab-case. Example: `button.tsx`, `input.tsx`, `card.tsx`, `dropdown-menu.tsx`
- Configuration files: kebab-case or dot prefix. Example: `eslint.config.mjs`, `tsconfig.json`

**Functions:**
- React components: PascalCase. Example: `function ChatMessage()`, `export function Button()`
- Custom hooks: camelCase prefixed with `use`. Example: `export function useIsMobile()`, `export function useApiCall<TData, TResponse>()`
- Utility functions: camelCase. Example: `generateId()`, `formatCurrency()`, `sanitizeUserInput()`
- Callback handlers in components: camelCase starting with `on` or action verb. Example: `onAction`, `onChange`, `onSuccess`, `onError`

**Variables:**
- Constants: UPPER_SNAKE_CASE. Example: `MOBILE_BREAKPOINT = 768`, `MAX_MESSAGE_LENGTH = 2000`, `HIGH_RISK_PATTERNS`
- State variables: camelCase. Example: `isMobile`, `loading`, `error`, `errorMessage`
- Type/interface instances: camelCase. Example: `message`, `account`, `transformedAccounts`

**Types:**
- Interfaces: PascalCase, typically prefixed with context or no prefix for general types. Example: `interface ChatMessageProps`, `interface ApiCallOptions<TData, TResponse>`, `interface Message`
- Type aliases: PascalCase. Example: `type MessageRole = "user" | "assistant"`, `type GuideStepId = "nav-accounts" | "nav-transactions"`
- Database types: Exported from database.types.ts, follow snake_case from schema. Transformed to camelCase in application code when used
- Generic type parameters: Single uppercase letter or descriptive PascalCase. Example: `<TData>`, `<TResponse>`

## Code Style

**Formatting:**
- ESLint configuration: `eslint.config.mjs` using ESLint v9 flat config format
- Core rules: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No Prettier configuration detected; ESLint handles style enforcement via Next.js configuration
- Target: ES2017, strict TypeScript enabled
- Supported file types: `.ts`, `.tsx`, `.mts`

**Linting:**
- Tool: ESLint 9 with Next.js and TypeScript presets
- Config file: `D:\My Project\Finauraa\eslint.config.mjs`
- Run command: `npm run lint` (executes `eslint` with no arguments, applies config)
- Auto-fix: Supported via ESLint standard flags
- Rules enforced: Web Vitals (Core Web Vitals), TypeScript strict checks, Next.js best practices
- Ignored patterns: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. React and core libraries: `import { React }`, `import { useState }`
2. Next.js imports: `import { useRouter }`, `import { NextRequest, NextResponse }`
3. Internal absolute imports: `import { createClient } from "@/lib/supabase/server"`
4. Relative imports: `import { cn } from "@/lib/utils"`
5. Type imports (can be interspersed): `import type { ClassValue }`

**Path Aliases:**
- Base alias `@/*` maps to root directory (`./*`)
- All imports use absolute imports with `@/` prefix
- Examples in codebase:
  - `import { cn } from "@/lib/utils"`
  - `import { createClient } from "@/lib/supabase/server"`
  - `import { ChatMessage } from "@/components/chat/chat-message"`
  - `import { useApiCall } from "@/hooks/use-api-call"`

## Error Handling

**Patterns:**

**API Routes (Next.js):**
- Try-catch wrapping entire handler. Example from `D:\My Project\Finauraa\app\api\chat\route.ts`:
```typescript
export async function POST(request: NextRequest) {
  try {
    // Main logic
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // More logic...
  } catch (error) {
    console.error("Chat API error:", error);

    let errorMessage = "Something went wrong. Please try again.";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "AI service configuration error. Please contact support.";
      } else if (error.message.includes("rate") || error.message.includes("limit")) {
        errorMessage = "AI service is busy. Please try again in a moment.";
        statusCode = 503;
      } else if (error.message.includes("timeout") || error.message.includes("network")) {
        errorMessage = "Connection issue. Please check your internet and try again.";
        statusCode = 504;
      } else if (error.message.includes("content") || error.message.includes("safety")) {
        errorMessage = "I couldn't process that request. Please try rephrasing.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { error: errorMessage, retryable: statusCode >= 500 },
      { status: statusCode }
    );
  }
}
```

**Client-side Hooks:**
- State-based error handling with try-catch. Example from `D:\My Project\Finauraa\hooks\use-api-call.ts`:
```typescript
const execute = useCallback(async (data?: TData): Promise<TResponse | null> => {
  setState((prev) => ({ ...prev, loading: true, error: null }));

  try {
    const response = await fetch(url, { /* config */ });
    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || result.message || `Request failed (${response.status})`;
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      onError?.(errorMessage);
      return null;
    }

    // Success handling
    setState({ data: transformedData, error: null, loading: false });
    onSuccess?.(transformedData);
    return transformedData;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    onError?.(errorMessage);
    return null;
  }
}, [/* deps */]);
```

**Security/Validation:**
- Input sanitization with risk levels. From `D:\My Project\Finauraa\lib\ai\sanitize.ts`:
```typescript
export interface SanitizeResult {
  sanitized: string;
  wasModified: boolean;
  injectionDetected: boolean;
  riskLevel: "none" | "medium" | "high";
}

// HIGH RISK patterns - block these
// MEDIUM RISK patterns - log but allow
// Check patterns sequentially, break on first match
```

**Data Access Validation:**
- Consent checks before accessing sensitive data. From `D:\My Project\Finauraa\app\api\finance\accounts\route.ts`:
```typescript
// BOBF/PDPL: Verify active consent before data access
const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/accounts");
if (!consentCheck.allowed) {
  return consentCheck.response; // Returns appropriate error response
}

if (consentCheck.noBanksConnected) {
  return NextResponse.json({ accounts: [], totalBalance: 0, noBanksConnected: true });
}
```

**User-Facing Errors:**
- Generic messages to prevent information leakage, but contextual where safe
- Always check `response.ok` before assuming success
- Provide retryable flag in error responses for client logic
- Log detailed errors server-side only

## Logging

**Framework:** `console` (no dedicated logging library detected)

**Patterns:**
- Server-side: `console.error()` for exceptions, context logged with error
- Example: `console.error("Chat API error:", error);`
- Security events: `logSecurityEvent(userId, eventType, details)` from middleware
- Example: `logSecurityEvent(user.id, "injection_attempt", { messagePreview, riskLevel })`
- Success tracking: `logDataAccessSuccess()` for compliance auditing
- Example: `await logDataAccessSuccess(user.id, "bank_account", consentId, endpoint, metadata)`
- No client-side logging detected in components

## Comments

**When to Comment:**
- Complex business logic or security-critical code
- Non-obvious algorithm implementations
- API behavior documentation
- Compliance/regulatory markers (e.g., "BOBF/PDPL: ...")

**JSDoc/TSDoc:**
- Used for exported functions and hooks
- Includes `@param`, `@returns`, `@example` tags where helpful
- Example from `D:\My Project\Finauraa\lib\utils.ts`:
```typescript
/**
 * Format currency with appropriate decimal places based on currency
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: BHD)
 * @param options - Formatting options
 *
 * @example
 * ```ts
 * formatCurrency(1234.567) // "BHD 1,234.567"
 * formatCurrency(1234.56, "USD") // "$1,234.56"
 * ```
 */
export function formatCurrency(amount: number, currency: string = "BHD", options?: { /* */ }): string
```

- Interface/type documentation minimal; used mainly for utility functions
- Comments explaining "why" not "what" the code does

## Function Design

**Size:**
- Majority of functions 50-100 lines maximum
- API route handlers may exceed 100 lines due to validation stacking and data transformations
- Hooks typically 150-200 lines for complex state management

**Parameters:**
- Prefer objects over multiple parameters for options. Example:
```typescript
export function useApiCall<TData = void, TResponse = unknown>(
  options: ApiCallOptions<TData, TResponse>  // Single object parameter
): ApiCallReturn<TData, TResponse>
```
- Generic type parameters for data transformations: `<TData, TResponse>`
- Optional properties in interfaces using `?:`

**Return Values:**
- Explicit type annotations on all exported functions
- Union types for error states (null or data): `Promise<TResponse | null>`
- Object returns for multiple related values. Example:
```typescript
return {
  data: transformedData,
  error: null,
  loading: false,
  execute: executeFunction,
  reset: resetFunction,
  clearError: clearErrorFunction
};
```

## Module Design

**Exports:**
- Named exports preferred: `export function useApiCall() {}`
- Single default export rare, avoided
- Example from `D:\My Project\Finauraa\components\ui\button.tsx`:
```typescript
export { Button, buttonVariants }
```

**Barrel Files:**
- Used in component subdirectories for organizing exports
- Example: `D:\My Project\Finauraa\components\chat\index.ts` re-exports chat components
- Not used extensively; most imports use direct paths

**Utility Organization:**
- Centralized in `lib/` directory:
  - `lib/utils.ts` - Core utilities (cn, currency formatting)
  - `lib/constants/` - Constants and category definitions
  - `lib/ai/` - AI-related utilities (sanitization, privacy, rate limiting)
  - `lib/supabase/` - Database client initialization
  - `lib/validations/` - Input validation schemas
- Hooks in `hooks/` directory:
  - Organized by feature/domain: `use-api-call.ts`, `use-transactions.ts`, `use-family-group.ts`
  - Typically 150-200 lines, handle state + side effects

---

*Convention analysis: 2026-01-25*
