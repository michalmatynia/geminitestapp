'use no memo';

import { useQueryClient } from '@tanstack/react-query';

import {
  type UserPreferences,
  type UserPreferencesResponse,
  type UserPreferencesUpdate,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
} from '@/shared/validations/user-preferences';

// These hooks delegate into TanStack Query factory wrappers. React Compiler can
// otherwise memoize the factory call and skip hooks inside it on later renders.

const userPreferencesQueryKey = QUERY_KEYS.userPreferences.all;
const emptyUserPreferences = normalizeUserPreferencesResponse({}) as UserPreferences;

type UserPreferencesQueryOptions = {
  enabled?: boolean;
};

const isComparableObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && value !== undefined && typeof value === 'object';

const hasPreferenceChanged = (
  current: UserPreferences | undefined,
  key: string,
  nextValue: unknown
): boolean => {
  const currentValue = (current as Record<string, unknown> | undefined)?.[key];
  if (isComparableObject(currentValue) && isComparableObject(nextValue)) {
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

export function useUserPreferences(
  options?: UserPreferencesQueryOptions
): SingleQuery<UserPreferences> {
  return createSingleQueryV2<UserPreferences>({
    id: 'current-user-preferences',
    enabled: options?.enabled ?? true,
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
          return emptyUserPreferences;
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
      const changedPayload: UserPreferencesUpdate = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => hasPreferenceChanged(current, key, value))
      );
      if (Object.keys(changedPayload).length === 0) {
        return Promise.resolve(current ?? emptyUserPreferences);
      }
      return api
        .patch<UserPreferencesResponse>('/api/user/preferences', changedPayload)
        .then(
          (response: UserPreferencesResponse) =>
            normalizeUserPreferencesResponse(response) as UserPreferences
        );
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
