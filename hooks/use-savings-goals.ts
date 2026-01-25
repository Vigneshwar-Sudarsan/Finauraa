import useSWR from "swr";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  category?: string;
  is_completed: boolean;
  auto_contribute: boolean;
  auto_contribute_percentage?: number;
  progress_percentage?: number;
  remaining?: number;
  days_remaining?: number | null;
}

interface SavingsGoalsResponse {
  goals: SavingsGoal[];
}

interface UseSavingsGoalsReturn {
  goals: SavingsGoal[];
  activeGoals: SavingsGoal[];
  completedGoals: SavingsGoal[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useSavingsGoals(): UseSavingsGoalsReturn {
  const { data, error, mutate } = useSWR<SavingsGoalsResponse>(
    "/api/finance/savings-goals",
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const goals = data?.goals ?? [];
  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return {
    goals,
    activeGoals,
    completedGoals,
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  };
}
