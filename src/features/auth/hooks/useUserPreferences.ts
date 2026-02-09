'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { logClientError } from '@/features/observability';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

export interface UserPreferences {
  adminMenuCollapsed?: boolean | null;
  aiPathsActivePathId?: string | null;
}

const USER_PREFERENCES_STALE_MS = 1000 * 60 * 5;

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const res = await fetch('/api/user/preferences', {
        credentials: 'include',
      });
      if (!res.ok) {
        logClientError(new Error(`[user-preferences] Failed to load user preferences: ${res.status}`), {
          context: { status: res.status, source: 'useUserPreferences' },
        });
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
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
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
