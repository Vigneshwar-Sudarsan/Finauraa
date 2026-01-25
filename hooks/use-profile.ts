import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_pro: boolean;
  subscription_tier: "free" | "pro" | "family";
  created_at: string;
}

interface AccountStats {
  connectedBanks: number;
  totalAccounts: number;
  transactionCount: number;
  oldestTransaction: string | null;
  budgetCount: number;
  goalsCount: number;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  stats: AccountStats | null;
  userId: string | null;
  userEmail: string;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useProfile(): UseProfileReturn {
  const supabase = createClient();

  // First, get the current user
  const { data: userData, error: userError } = useSWR(
    "auth-user",
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache auth for 1 minute
    }
  );

  const userId = userData?.id ?? null;
  const userEmail = userData?.email ?? "";

  // Then fetch profile data (only if we have a userId)
  const { data: profileData, error: profileError, mutate } = useSWR(
    userId ? `profile-${userId}` : null,
    async () => {
      if (!userId) return null;

      // Fetch profile and subscription data in parallel
      const [profileResult, subscriptionResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
        fetch("/api/subscription").then(res => res.ok ? res.json() : null).catch(() => null)
      ]);

      if (profileResult.error) throw profileResult.error;

      // Merge subscription tier from API (most accurate) with profile data
      const profile = {
        ...profileResult.data,
        subscription_tier: subscriptionResult?.subscription?.tier || profileResult.data.subscription_tier || "free"
      };

      // Fetch stats in parallel
      const [
        { count: bankCount },
        { count: accountCount },
        { count: transactionCount },
        { data: oldestTx },
        { count: budgetCount },
      ] = await Promise.all([
        supabase.from("bank_connections").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("bank_accounts").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("transactions").select("transaction_date").eq("user_id", userId).order("transaction_date", { ascending: true }).limit(1),
        supabase.from("budgets").select("*", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const stats: AccountStats = {
        connectedBanks: bankCount || 0,
        totalAccounts: accountCount || 0,
        transactionCount: transactionCount || 0,
        oldestTransaction: oldestTx?.[0]?.transaction_date || null,
        budgetCount: budgetCount || 0,
        goalsCount: 0,
      };

      return { profile, stats };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache profile for 30 seconds
    }
  );

  // isLoading is true if:
  // 1. Auth is still loading (!userData && !userError), OR
  // 2. Auth succeeded (userId exists) but profile is still loading (!profileData && !profileError)
  const isAuthLoading = !userData && !userError;
  const isProfileLoading = userId ? (!profileData && !profileError) : false;
  const isLoading = isAuthLoading || isProfileLoading;

  return {
    profile: profileData?.profile ?? null,
    stats: profileData?.stats ?? null,
    userId,
    userEmail,
    isLoading,
    isError: !!userError || !!profileError,
    mutate,
  };
}
