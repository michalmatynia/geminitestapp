'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import type { UserPreferences, UserPreferencesUpdate } from '@/shared/types/domain/user-preferences';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';

const userPreferencesQueryKey = ['user-preferences'] as const;

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: () =>
      api.get<unknown>('/api/user/preferences')
        .then((data: unknown) => normalizeUserPreferencesResponse(data) as UserPreferences)
        .catch(error => {
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
    mutationFn: (data: UserPreferencesUpdate) => {
      const validation = userPreferencesUpdateSchema.safeParse(data);
      if (!validation.success) {
        throw new Error('Invalid user preferences payload.');
      }
      const payload = normalizeUserPreferencesUpdatePayload(validation.data);
      return api.patch<UserPreferences>('/api/user/preferences', payload);
    },
    onSuccess: (data: UserPreferences): void => {
      queryClient.setQueryData(
        userPreferencesQueryKey,
        normalizeUserPreferencesResponse(data) as UserPreferences
      );
    },
  });
}
