# SWR Caching Implementation

This document describes the client-side data caching strategy using [SWR](https://swr.vercel.app/) (stale-while-revalidate) across the Finauraa app.

## Overview

SWR is used to cache API responses client-side, preventing unnecessary data re-fetching when users navigate between pages. This improves performance and reduces API load while still ensuring data freshness.

## Hooks

### `useBankConnections`
**File:** `hooks/use-bank-connections.ts`
**Endpoint:** `/api/finance/banks`
**Used by:** DashboardContent, AccountsContent, SpendingContent, TransactionsContent

```typescript
const { banks, isLoading, error, mutate } = useBankConnections();
```

Returns connected banks with their accounts.

---

### `useSpending`
**File:** `hooks/use-spending.ts`
**Endpoints:** `/api/finance/insights/spending`, `/api/finance/budgets`
**Used by:** SpendingContent, GoalsContent

```typescript
const { data, budgets, isLoading, isBudgetsLoading, mutate, mutateBudgets } = useSpending();
```

Returns spending insights and budget data.

---

### `useTransactions`
**File:** `hooks/use-transactions.ts`
**Endpoint:** `/api/finance/transactions`
**Used by:** TransactionsContent

```typescript
const { transactions, subscription, isLoading, mutate } = useTransactions();
```

Returns transactions with optional filter parameters.

---

### `useSavingsGoals`
**File:** `hooks/use-savings-goals.ts`
**Endpoint:** `/api/finance/savings-goals`
**Used by:** GoalsContent

```typescript
const { goals, activeGoals, completedGoals, isLoading, mutate } = useSavingsGoals();
```

Returns savings goals with computed active/completed lists.

---

### `useFamilyGroup`
**File:** `hooks/use-family-group.ts`
**Endpoint:** `/api/family/group`
**Used by:** FamilyContent

```typescript
const { data, isLoading, isError, error, mutate } = useFamilyGroup();
```

Returns family group data including members and user role.

---

### `useProfile`
**File:** `hooks/use-profile.ts`
**Endpoint:** `/api/user/profile`
**Used by:** ProfileContent, SettingsContent

```typescript
const { profile, isLoading, mutate } = useProfile();
```

Returns user profile data.

---

### `useSubscription`
**File:** `hooks/use-subscription.ts`
**Endpoint:** `/api/subscription`
**Used by:** SubscriptionContent, various components

```typescript
const { subscription, isLoading, error, mutate } = useSubscription();
```

Returns subscription status and plan details.

---

### `useAIMode`
**File:** `hooks/use-ai-mode.ts`
**Endpoint:** `/api/user/ai-mode`
**Used by:** AIPrivacySettings

```typescript
const { aiMode, isLoading, mutate } = useAIMode();
```

Returns AI mode preference (local/hybrid).

## Configuration

All hooks share these SWR options:

```typescript
{
  revalidateOnFocus: false,  // Don't refetch when tab gains focus
  dedupingInterval: 30000,   // 30 second deduplication window
}
```

### Why these settings?

1. **`revalidateOnFocus: false`** - Financial data shouldn't auto-refresh when users switch tabs. This gives users control over when data updates.

2. **`dedupingInterval: 30000`** - Prevents duplicate requests within 30 seconds. If a user navigates away and back quickly, cached data is used.

## Cache Invalidation

After mutations (create, update, delete), call `mutate()` to refresh the cache:

```typescript
// Example: After creating a budget
const handleCreateBudget = async (data) => {
  await fetch('/api/finance/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Refresh the cache
  mutateBudgets();
};
```

## Important Considerations

### AI Chat Streaming
The chat feature (`/api/chat`) uses native fetch with streaming, NOT SWR. Streaming responses cannot be cached.

### Sensitive Data
- Cache is session-only (cleared on page refresh/close)
- No persistent storage of financial data
- Users can always force refresh via UI buttons

### Manual Refresh
All components provide manual refresh buttons that call `mutate()`:

```tsx
<Button onClick={() => mutate()}>
  <ArrowClockwise size={16} />
  Refresh
</Button>
```

## Adding New Hooks

When creating a new SWR hook:

1. Create the hook in `hooks/use-{feature}.ts`
2. Use consistent configuration:
   ```typescript
   const { data, error, mutate } = useSWR<ResponseType>(
     '/api/endpoint',
     fetcher,
     {
       revalidateOnFocus: false,
       dedupingInterval: 30000,
     }
   );
   ```
3. Return `isLoading` computed as `!data && !error`
4. Export `mutate` for cache invalidation
5. Update components to use the hook and remove manual fetch logic

## File Structure

```
hooks/
├── use-ai-mode.ts
├── use-bank-connection.ts      # Single bank connection flow (not SWR)
├── use-bank-connections.ts     # All banks data (SWR)
├── use-family-group.ts
├── use-profile.ts
├── use-savings-goals.ts
├── use-spending.ts
├── use-subscription.ts
└── use-transactions.ts
```
