 
'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';

import {
  fetchSettingsCached,
  fetchLiteSettingsCached,
  invalidateSettingsCache,
  type SettingsScope,
} from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { SystemSetting } from '@/shared/types/domain/settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { SystemSetting };

const selectSettingsMap = (data: SystemSetting[]): Map<string, string> =>
  new Map(data.map((item) => [item.key, item.value]));

export function useSettings(options?: { scope?: SettingsScope; enabled?: boolean }): UseQueryResult<SystemSetting[], Error> {
  const scope = options?.scope ?? 'light';
  return useQuery({
    queryKey: QUERY_KEYS.settings.scope(scope),
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope }));
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useSettings', action: 'fetchSettings', scope, level: 'warn' } });
        return [];
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useSettingsMap(options?: { scope?: SettingsScope; enabled?: boolean }): UseQueryResult<Map<string, string>, Error> {
  const scope = options?.scope ?? 'light';
  return useQuery({
    queryKey: QUERY_KEYS.settings.scope(scope),
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope }));
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useSettings', action: 'fetchSettings', scope, level: 'warn' } });
        return [];
      }
    },
    select: selectSettingsMap,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useLiteSettingsMap(options?: { enabled?: boolean }): UseQueryResult<Map<string, string>, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.settings.scope('lite'),
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchLiteSettingsCached());
      } catch (error) {
        logClientError(error instanceof Error ? error : new Error(String(error)), { context: { source: 'useLiteSettingsMap', action: 'fetchLiteSettings', level: 'warn' } });
        return [];
      }
    },
    select: selectSettingsMap,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useUpdateSetting(): UseMutationResult<
  SystemSetting,
  Error,
  { key: string; value: string }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string;
    }): Promise<SystemSetting> => {
      const res = await api.post<SystemSetting>('/api/settings', { key, value });
      invalidateSettingsCache();
      return res;
    },
    onSuccess: (): void => {
      void invalidateAllSettings(queryClient);
    },
  });
}

export function useUpdateSettingsBulk(): UseMutationResult<
  SystemSetting[],
  Error,
  Array<{ key: string; value: string }>
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>,
    ): Promise<SystemSetting[]> => {
      // Keep bulk writes sequential to avoid write-rate spikes and ordering races
      // when multiple settings are persisted together.
      const uniquePayloads = Array.from(
        new Map(payloads.map((payload) => [payload.key, payload])).values()
      );
      const responses: SystemSetting[] = [];
      for (const payload of uniquePayloads) {
        const response = await api.post<SystemSetting>('/api/settings', payload);
        responses.push(response);
      }
      invalidateSettingsCache();
      return responses;
    },
    onSuccess: (): void => {
      void invalidateAllSettings(queryClient);
    },
  });
}
