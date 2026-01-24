import useSWR from "swr";

interface Account {
  id: string;
  account_id: string;
  account_type: string;
  account_number: string;
  currency: string;
  balance: number;
  available_balance: number;
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
}

interface UseBankConnectionsReturn {
  banks: BankConnection[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useBankConnections(): UseBankConnectionsReturn {
  const { data, error, mutate } = useSWR<BankConnectionsData>(
    "/api/finance/banks",
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    banks: data?.banks ?? [],
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  };
}
