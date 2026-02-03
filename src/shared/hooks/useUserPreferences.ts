"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { UserPreferences, UserPreferencesUpdate } from "@/shared/types/domain/user-preferences";

export const userPreferencesQueryKey = ["user-preferences"] as const;

async function fetchUserPreferences(): Promise<UserPreferences> {
  const res = await fetch("/api/user/preferences");
  if (!res.ok) {
    console.warn("[user-preferences] Failed to load user preferences", res.status);
    return {} as UserPreferences;
  }
  return (await res.json()) as UserPreferences;
}

async function updateUserPreferences(data: UserPreferencesUpdate): Promise<UserPreferences> {
  const res = await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to update user preferences");
  }
  return (await res.json()) as UserPreferences;
}

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useUpdateUserPreferences(): UseMutationResult<UserPreferences, Error, UserPreferencesUpdate> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (data: UserPreferences): void => {
      queryClient.setQueryData(userPreferencesQueryKey, data);
    },
  });
}
