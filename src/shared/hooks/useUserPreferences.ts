import { useQueryClient } from '@tanstack/react-query';

import {
  type UserPreferences,
  type UserPreferencesResponse,
  type UserPreferencesUpdate,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
} from '@/shared/validations/user-preferences';

const userPreferencesQueryKey = QUERY_KEYS.userPreferences.all;

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
    } catch (error) {
      logClientCatch(error, {
        source: 'useUserPreferences',
        action: 'compareNestedPreferenceValue',
        preferenceKey: key,
        level: 'warn',
      });
      return true;
    }
  }
  return currentValue !== nextValue;
};

export function useUserPreferences(): SingleQuery<UserPreferences> {
  return createSingleQueryV2<UserPreferences>({
    id: 'current-user-preferences',
    queryKey: userPreferencesQueryKey,
    queryFn: ({ signal }) =>
      api
        .get<UserPreferencesResponse>('/api/user/preferences', { signal })
        .then((data: UserPreferencesResponse) => normalizeUserPreferencesResponse(data) as UserPreferences)
        .catch((error) => {
          logClientCatch(error, {
            source: 'useUserPreferences',
            action: 'loadUserPreferences',
            level: 'warn',
          });
          return {} as UserPreferences;
        }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'shared.hooks.useUserPreferences',
      operation: 'detail',
      resource: 'user-preferences',
      domain: 'auth',
      tags: ['user-preferences'],
      description: 'Loads user preferences.'},
  });
}

export function useUpdateUserPreferences(): MutationResult<UserPreferences, UserPreferencesUpdate> {
  const queryClient = useQueryClient();

  return createUpdateMutationV2<UserPreferences, UserPreferencesUpdate>({
    mutationKey: QUERY_KEYS.userPreferences.mutation('update'),
    mutationFn: (data: UserPreferencesUpdate) => {
      const validation = userPreferencesUpdateSchema.safeParse(data);
      if (!validation.success) {
        throw new Error('Invalid user preferences payload.');
      }
      const payload = normalizeUserPreferencesUpdatePayload(validation.data);
      const current =
        queryClient.getQueryData<UserPreferences>(userPreferencesQueryKey) ?? undefined;
      const changedPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => hasPreferenceChanged(current, key, value))
      ) as UserPreferencesUpdate;
      if (Object.keys(changedPayload).length === 0) {
        return Promise.resolve((current ?? {}) as UserPreferences);
      }
      return api
        .patch<UserPreferencesResponse>('/api/user/preferences', changedPayload)
        .then((data: UserPreferencesResponse) => normalizeUserPreferencesResponse(data) as UserPreferences);
    },
    onSuccess: (data: UserPreferences): void => {
      queryClient.setQueryData(userPreferencesQueryKey, data);
    },
    meta: {
      source: 'shared.hooks.useUpdateUserPreferences',
      operation: 'update',
      resource: 'user-preferences',
      domain: 'auth',
      tags: ['user-preferences', 'update'],
      description: 'Updates user preferences.'},
  });
}
