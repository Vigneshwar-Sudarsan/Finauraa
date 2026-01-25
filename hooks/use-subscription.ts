import useSWR from "swr";

interface SubscriptionInfo {
  tier: "free" | "pro" | "family";
  status: "active" | "canceled" | "past_due" | "trialing" | "canceling" | "paused" | "incomplete";
  billingCycle: "monthly" | "yearly";
  startedAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  isFamilyMember?: boolean;
}

interface UsageData {
  bankConnections: { used: number; limit: number | null };
  transactions: { used: number; limit: number | null };
  aiQueries: { used: number; limit: number };
  exports: { used: number; limit: number };
}

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  description: string;
  invoiceUrl: string | null;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  type: "card";
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  isSubscriptionPayment: boolean;
}

interface SubscriptionData {
  subscription: SubscriptionInfo;
  usage: UsageData;
  billingHistory: BillingRecord[];
  paymentMethods: PaymentMethod[];
}

interface UseSubscriptionReturn {
  subscription: SubscriptionInfo;
  usage: UsageData;
  billingHistory: BillingRecord[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

const defaultSubscription: SubscriptionInfo = {
  tier: "free",
  status: "active",
  billingCycle: "monthly",
  startedAt: null,
  endsAt: null,
  trialEndsAt: null,
  isFamilyMember: false,
};

const defaultUsage: UsageData = {
  bankConnections: { used: 0, limit: 1 },
  transactions: { used: 0, limit: 500 },
  aiQueries: { used: 0, limit: 5 },
  exports: { used: 0, limit: 0 },
};

export function useSubscription(): UseSubscriptionReturn {
  const { data, error, mutate } = useSWR<SubscriptionData>(
    "/api/subscription",
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    subscription: data?.subscription ?? defaultSubscription,
    usage: data?.usage ?? defaultUsage,
    billingHistory: data?.billingHistory ?? [],
    paymentMethods: data?.paymentMethods ?? [],
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  };
}

// Simplified hook for settings page that only needs tier info
interface UseSubscriptionTierReturn {
  tier: "free" | "pro" | "family";
  isFamilyMember: boolean;
  isLoading: boolean;
}

export function useSubscriptionTier(): UseSubscriptionTierReturn {
  const { subscription, isLoading } = useSubscription();

  return {
    tier: subscription.tier,
    isFamilyMember: subscription.isFamilyMember ?? false,
    isLoading,
  };
}
