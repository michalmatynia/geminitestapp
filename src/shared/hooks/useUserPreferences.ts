'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';


import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { UserPreferences, UserPreferencesUpdate } from '@/shared/types/domain/user-preferences';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';

const userPreferencesQueryKey = QUERY_KEYS.userPreferences;

const hasPreferenceChanged = (
  current: UserPreferences | undefined,
  key: string,
  nextValue: unknown
): boolean => {
  const currentValue = (current as Record<string, unknown> | undefined)?.[key];
  if (
    currentValue &&
    typeof currentValue === 'object' &&
    nextValue &&
    typeof nextValue === 'object'
  ) {
    try {
      return JSON.stringify(currentValue) !== JSON.stringify(nextValue);
    } catch {
      return true;
    }
  }
  return currentValue !== nextValue;
};

export function useUserPreferences(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: ({ signal }) =>
      api.get<unknown>('/api/user/preferences', { signal })
        .then((data: unknown) => normalizeUserPreferencesResponse(data) as UserPreferences)
        .catch(error => {
          logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useUserPreferences', action: 'loadUserPreferences', level: 'warn' } });
          return {} as UserPreferences;
        }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      const current = queryClient.getQueryData<UserPreferences>(userPreferencesQueryKey) ?? undefined;
      const changedPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => hasPreferenceChanged(current, key, value))
      ) as UserPreferencesUpdate;
      if (Object.keys(changedPayload).length === 0) {
        return Promise.resolve((current ?? {}) as UserPreferences);
      }
      return api.patch<UserPreferences>('/api/user/preferences', changedPayload);
    },
    onSuccess: (data: UserPreferences): void => {
      queryClient.setQueryData(
        userPreferencesQueryKey,
        normalizeUserPreferencesResponse(data) as UserPreferences
      );
    },
  });
}
