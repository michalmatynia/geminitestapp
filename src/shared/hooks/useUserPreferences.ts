'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { UserPreferences, UserPreferencesUpdate } from '@/shared/types/domain/user-preferences';

const userPreferencesQueryKey = ['user-preferences'] as const;

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: () => api.get<UserPreferences>('/api/user/preferences').catch(error => {
      console.warn('[user-preferences] Failed to load user preferences', error);
      return {} as UserPreferences;
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useUpdateUserPreferences(): UseMutationResult<UserPreferences, Error, UserPreferencesUpdate> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserPreferencesUpdate) => 
      api.patch<UserPreferences>('/api/user/preferences', data),
    onSuccess: (data: UserPreferences): void => {
      queryClient.setQueryData(userPreferencesQueryKey, data);
    },
  });
}
