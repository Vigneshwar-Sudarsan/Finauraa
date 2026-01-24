import useSWR from "swr";
import { FamilyGroupWithMembers } from "@/lib/types";

interface FamilyGroupData {
  group: FamilyGroupWithMembers | null;
  userRole: "owner" | "admin" | "member" | null;
  isOwner: boolean;
  canCreate?: boolean;
  requiresUpgrade?: boolean;
}

interface UseFamilyGroupReturn {
  data: FamilyGroupData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  mutate: () => void;
}

export function useFamilyGroup(): UseFamilyGroupReturn {
  const { data, error, mutate } = useSWR<FamilyGroupData>(
    "/api/family/group",
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        if (result.requiresUpgrade) {
          return {
            group: null,
            userRole: null,
            isOwner: false,
            requiresUpgrade: true,
          };
        }
        throw new Error(result.error || "Failed to fetch family group");
      }

      return {
        group: result.group,
        userRole: result.userRole || null,
        isOwner: result.isOwner || false,
        canCreate: result.canCreate || false,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    data: data ?? null,
    isLoading: !data && !error,
    isError: !!error,
    error: error?.message ?? null,
    mutate,
  };
}
