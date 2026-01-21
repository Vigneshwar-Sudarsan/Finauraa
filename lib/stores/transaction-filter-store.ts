import { create } from "zustand";

export interface TransactionFilters {
  type: "all" | "credit" | "debit";
  category: string;
  bankId: string;
  accountId: string;
  minAmount: string;
  maxAmount: string;
}

interface TransactionFilterState {
  // Filter values
  filters: TransactionFilters;
  searchQuery: string;

  // Flag to indicate filter was set from external navigation (e.g., account details)
  pendingAccountFilter: string | null;

  // Actions
  setFilters: (filters: TransactionFilters) => void;
  updateFilter: <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => void;
  setSearchQuery: (query: string) => void;
  setPendingAccountFilter: (accountId: string | null) => void;
  clearFilters: () => void;
  consumePendingFilter: () => string | null;
}

const defaultFilters: TransactionFilters = {
  type: "all",
  category: "all",
  bankId: "all",
  accountId: "all",
  minAmount: "",
  maxAmount: "",
};

export const useTransactionFilterStore = create<TransactionFilterState>((set, get) => ({
  filters: defaultFilters,
  searchQuery: "",
  pendingAccountFilter: null,

  setFilters: (filters) => set({ filters }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setPendingAccountFilter: (accountId) => set({ pendingAccountFilter: accountId }),

  clearFilters: () =>
    set({
      filters: defaultFilters,
      searchQuery: "",
      pendingAccountFilter: null,
    }),

  // Consume and clear the pending filter (returns it once, then clears)
  consumePendingFilter: () => {
    const pending = get().pendingAccountFilter;
    if (pending) {
      set({ pendingAccountFilter: null });
    }
    return pending;
  },
}));
