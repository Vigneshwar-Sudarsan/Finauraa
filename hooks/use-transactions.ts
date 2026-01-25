import useSWR from "swr";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  category: string;
  category_group?: string;
  category_icon?: string;
  description?: string;
  merchant_name?: string;
  merchant_logo?: string;
  provider_id?: string;
  transaction_date: string;
  is_manual?: boolean;
  account_id?: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  subscription?: {
    tier: string;
    historyDaysLimit: number | null;
    isLimited: boolean;
  };
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  subscription: TransactionsResponse["subscription"] | null;
  pagination: TransactionsResponse["pagination"] | null;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useTransactions(params?: {
  limit?: number;
  offset?: number;
  accountId?: string;
  bankId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}): UseTransactionsReturn {
  // Build query string
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.offset) queryParams.set("offset", params.offset.toString());
  if (params?.accountId && params.accountId !== "all") queryParams.set("accountId", params.accountId);
  if (params?.bankId && params.bankId !== "all") queryParams.set("bankId", params.bankId);
  if (params?.category && params.category !== "all") queryParams.set("category", params.category);
  if (params?.startDate) queryParams.set("startDate", params.startDate);
  if (params?.endDate) queryParams.set("endDate", params.endDate);

  const queryString = queryParams.toString();
  const url = `/api/finance/transactions${queryString ? `?${queryString}` : ""}`;

  const { data, error, mutate } = useSWR<TransactionsResponse>(
    url,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    transactions: data?.transactions ?? [],
    subscription: data?.subscription ?? null,
    pagination: data?.pagination ?? null,
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  };
}
