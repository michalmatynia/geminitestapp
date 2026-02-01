import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface UserPreferences {
  adminMenuCollapsed?: boolean | null;
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: async (): Promise<UserPreferences> => {
      const res = await fetch("/api/user/preferences", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load user preferences.");
      return await res.json();
    },
  });
}

export function useUpdateUserPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserPreferences) => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user preferences.");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user-preferences"], data);
    },
  });
}
