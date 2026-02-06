'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

export interface UserPreferences {
  adminMenuCollapsed?: boolean | null;
}

const USER_PREFERENCES_STALE_MS = 10_000;

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const res = await fetch('/api/user/preferences', {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('[user-preferences] Failed to load user preferences', res.status);
        return {};
      }
      return (await res.json()) as UserPreferences;
    },
    staleTime: USER_PREFERENCES_STALE_MS,
    retry: 1,
  });
}

export function useUpdateUserPreferencesMutation(): UseMutationResult<UserPreferences, Error, UserPreferences> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserPreferences): Promise<UserPreferences> => {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user preferences.');
      return (await res.json()) as UserPreferences;
    },
    onSuccess: (data: UserPreferences) => {
      queryClient.setQueryData(['user-preferences'], data);
    },
  });
}
