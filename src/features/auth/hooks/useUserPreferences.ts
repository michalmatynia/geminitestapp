'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { logClientError } from '@/features/observability';
import { api } from '@/shared/lib/api-client';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';

export interface UserPreferences {
  adminMenuCollapsed?: boolean | null;
  aiPathsActivePathId?: string | null;
}

const USER_PREFERENCES_STALE_MS = 1000 * 60 * 5;

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
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      try {
        const payload = await api.get<unknown>('/api/user/preferences', { logError: false });
        return normalizeUserPreferencesResponse(payload) as UserPreferences;
      } catch (error) {
        logClientError(error, {
          context: { source: 'useUserPreferences', action: 'loadUserPreferences' },
        });
        return {};
      }
    },
    staleTime: USER_PREFERENCES_STALE_MS,
    retry: 1,
  });
}

export function useUpdateUserPreferencesMutation(): UseMutationResult<UserPreferences, Error, UserPreferences> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserPreferences): Promise<UserPreferences> => {
      const validation = userPreferencesUpdateSchema.safeParse(data);
      if (!validation.success) {
        throw new Error('Invalid user preferences payload.');
      }
      const payload = normalizeUserPreferencesUpdatePayload(validation.data);
      const current = queryClient.getQueryData<UserPreferences>(['user-preferences']) ?? undefined;
      const changedPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => hasPreferenceChanged(current, key, value))
      ) as UserPreferences;
      if (Object.keys(changedPayload).length === 0) {
        return (current ?? {});
      }
      const updated = await api.patch<unknown>('/api/user/preferences', changedPayload);
      return normalizeUserPreferencesResponse(updated) as UserPreferences;
    },
    onSuccess: (data: UserPreferences) => {
      queryClient.setQueryData(
        ['user-preferences'],
        normalizeUserPreferencesResponse(data) as UserPreferences
      );
    },
  });
}
