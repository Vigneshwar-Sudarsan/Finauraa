import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_pro: boolean;
  subscription_tier: "free" | "pro" | "family";
  created_at: string;
  country: "BH" | "SA";
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

  // 1. Get the current user (fast, cached 1 min)
  const { data: userData, error: userError } = useSWR(
    "auth-user",
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const userId = userData?.id ?? null;
  const userEmail = userData?.email ?? "";

  // 2. Profile data only - fast (single DB query, no API calls)
  // subscription_tier is kept in sync by Stripe webhooks, no need to call /api/subscription
  const { data: profileData, error: profileError, mutate: mutateProfile } = useSWR(
    userId ? `profile-${userId}` : null,
    async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      return {
        ...data,
        subscription_tier: data.subscription_tier || "free",
      } as ProfileData;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // 3. Stats - loads in background after profile is ready
  const { data: statsData, mutate: mutateStats } = useSWR(
    profileData ? `profile-stats-${userId}` : null,
    async () => {
      if (!userId || !profileData) return null;

      const userRegion = profileData.country || "BH";

      const { data: regionConnections } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("region", userRegion);
      const regionConnectionIds = (regionConnections || []).map((c) => c.id);

      let regionAccountIds: string[] = [];
      if (regionConnectionIds.length > 0) {
        const { data: regionAccounts } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("user_id", userId)
          .in("connection_id", regionConnectionIds);
        regionAccountIds = (regionAccounts || []).map((a) => a.id);
      }

      const [
        { count: bankCount },
        { count: accountCount },
        { count: transactionCount },
        { data: oldestTx },
        { count: budgetCount },
      ] = await Promise.all([
        supabase.from("bank_connections").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("region", userRegion),
        regionConnectionIds.length > 0
          ? supabase.from("bank_accounts").select("*", { count: "exact", head: true }).eq("user_id", userId).in("connection_id", regionConnectionIds)
          : Promise.resolve({ count: 0 }),
        regionAccountIds.length > 0
          ? supabase.from("transactions").select("*", { count: "exact", head: true }).eq("user_id", userId).in("account_id", regionAccountIds)
          : Promise.resolve({ count: 0 }),
        regionAccountIds.length > 0
          ? supabase.from("transactions").select("transaction_date").eq("user_id", userId).in("account_id", regionAccountIds).order("transaction_date", { ascending: true }).limit(1)
          : Promise.resolve({ data: null }),
        supabase.from("budgets").select("*", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      return {
        connectedBanks: bankCount || 0,
        totalAccounts: accountCount || 0,
        transactionCount: transactionCount || 0,
        oldestTransaction: oldestTx?.[0]?.transaction_date || null,
        budgetCount: budgetCount || 0,
        goalsCount: 0,
      } as AccountStats;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const mutate = () => {
    mutateProfile();
    mutateStats();
  };

  const isAuthLoading = !userData && !userError;
  const isProfileLoading = userId ? (!profileData && !profileError) : false;
  const isLoading = isAuthLoading || isProfileLoading;

  return {
    profile: profileData ?? null,
    stats: statsData ?? null,
    userId,
    userEmail,
    isLoading,
    isError: !!userError || !!profileError,
    mutate,
  };
}
