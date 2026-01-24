import useSWR from "swr";

interface AIModeData {
  mode: "privacy-first" | "enhanced";
  hasConsent: boolean;
}

interface UseAIModeReturn {
  mode: "privacy-first" | "enhanced";
  hasConsent: boolean;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useAIMode(): UseAIModeReturn {
  const { data, error, mutate } = useSWR<AIModeData>(
    "/api/user/ai-mode",
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    mode: data?.mode ?? "privacy-first",
    hasConsent: data?.hasConsent ?? false,
    isLoading: !data && !error,
    isError: !!error,
    mutate,
  };
}
