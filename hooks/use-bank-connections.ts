import useSWR from "swr";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  determineSyncType,
  getOldestSyncTime,
  formatTimeAgo,
} from "@/lib/sync-config";

interface Account {
  id: string;
  account_id: string;
  account_type: string;
  account_number: string;
  currency: string;
  balance: number;
  available_balance: number;
  last_synced_at?: string | null;
}

interface BankConnection {
  id: string;
  bank_id: string;
  bank_name: string;
  status: string;
  accounts: Account[];
}

interface BankConnectionsData {
  banks: BankConnection[];
  totalBalance?: number;
  totalAccounts?: number;
  bankCount?: number;
  noBanksConnected?: boolean;
}

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface UseBankConnectionsReturn {
  banks: BankConnection[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
  // Auto-sync state
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncedFormatted: string;
  isSyncing: boolean;
  triggerSync: (force?: boolean) => Promise<void>;
  noBanksConnected: boolean;
}

export function useBankConnections(): UseBankConnectionsReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  const { data, error, mutate } = useSWR<BankConnectionsData>(
    "/api/finance/banks",
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Get the oldest sync time across all accounts
  const allAccounts = data?.banks?.flatMap((b) => b.accounts) ?? [];
  const lastSyncedAt = getOldestSyncTime(allAccounts);
  const lastSyncedFormatted = formatTimeAgo(lastSyncedAt);

  // Sync function that determines the right sync type
  const triggerSync = useCallback(
    async (force = false) => {
      // Don't sync if no banks connected
      if (data?.noBanksConnected) return;

      // Determine what type of sync is needed
      const syncType = force ? "full" : determineSyncType(lastSyncedAt);

      if (syncType === "none") {
        // Data is fresh, no sync needed
        return;
      }

      setSyncStatus("syncing");
      setLastSyncError(null);

      try {
        let endpoint: string;
        let method: string;

        if (syncType === "balance-only") {
          // Quick balance-only refresh
          endpoint = "/api/finance/refresh-balances";
          method = "POST";
        } else {
          // Full incremental sync
          endpoint = "/api/finance/refresh";
          method = "POST";
        }

        const response = await fetch(endpoint, { method });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        // Refresh the data from the server
        await mutate();
        setSyncStatus("synced");

        // Reset to idle after a short delay
        setTimeout(() => {
          setSyncStatus("idle");
        }, 2000);
      } catch (err) {
        console.error("Auto-sync error:", err);
        setLastSyncError(err instanceof Error ? err.message : "Sync failed");
        setSyncStatus("error");

        // Reset to idle after showing error
        setTimeout(() => {
          setSyncStatus("idle");
        }, 3000);
      }
    },
    [data?.noBanksConnected, lastSyncedAt, mutate]
  );

  // Auto-sync on mount when data becomes available
  useEffect(() => {
    // Only run once when data first loads
    if (!data || hasSyncedRef.current) return;

    // Don't auto-sync if no banks connected
    if (data.noBanksConnected || data.banks?.length === 0) {
      hasSyncedRef.current = true;
      return;
    }

    // Check if we need to sync
    const syncType = determineSyncType(lastSyncedAt);

    if (syncType !== "none") {
      hasSyncedRef.current = true;
      // Delay slightly to avoid blocking initial render
      const timer = setTimeout(() => {
        triggerSync();
      }, 500);
      return () => clearTimeout(timer);
    }

    hasSyncedRef.current = true;
  }, [data, lastSyncedAt, triggerSync]);

  return {
    banks: data?.banks ?? [],
    isLoading: !data && !error,
    isError: !!error,
    mutate,
    // Auto-sync state
    syncStatus,
    lastSyncedAt,
    lastSyncedFormatted,
    isSyncing: syncStatus === "syncing",
    triggerSync,
    noBanksConnected: data?.noBanksConnected ?? false,
  };
}
