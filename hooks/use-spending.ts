import useSWR from "swr";
import { useProfile } from "@/hooks/use-profile";

interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

interface IncomeSource {
  type: string;
  amount: number;
  count: number;
  percentage: number;
}

interface SpendingData {
  totalSpending: number;
  totalIncome: number;
  currency: string;
  categories: SpendingCategory[];
  incomeSources?: IncomeSource[];
  topMerchants?: { name: string; amount: number; count: number }[];
  period?: { from: string; to: string };
  fallback?: boolean;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
}

interface UseSpendingReturn {
  data: SpendingData | null;
  budgets: Budget[];
  isLoading: boolean;
  isBudgetsLoading: boolean;
  isError: boolean;
  mutate: () => void;
  mutateBudgets: () => void;
}

export function useSpending(): UseSpendingReturn {
  const { profile } = useProfile();
  const country = profile?.country || "BH";

  const { data, error, mutate } = useSWR<SpendingData>(
    `/api/finance/insights/spending?region=${country}`,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: false,
    }
  );

  const { data: budgetsData, error: budgetsError, mutate: mutateBudgets } = useSWR<{ budgets: Budget[] }>(
    `/api/finance/budgets?region=${country}`,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: false,
    }
  );

  return {
    data: data ?? null,
    budgets: budgetsData?.budgets ?? [],
    isLoading: !data && !error,
    isBudgetsLoading: !budgetsData && !budgetsError,
    isError: !!error,
    mutate,
    mutateBudgets,
  };
}
