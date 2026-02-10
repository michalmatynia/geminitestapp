 
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
import { logClientError } from '@/features/observability';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type { SystemSetting } from '@/shared/types/domain/settings';
import { logger } from '@/shared/utils/logger';

export type { SystemSetting };

const selectSettingsMap = (data: SystemSetting[]): Map<string, string> =>
  new Map(data.map((item) => [item.key, item.value]));

export function useSettings(options?: { scope?: SettingsScope; enabled?: boolean }): UseQueryResult<SystemSetting[], Error> {
  const scope = options?.scope ?? 'light';
  return useQuery({
    queryKey: ['settings', scope],
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope })) as SystemSetting[];
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
    queryKey: ['settings', scope],
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope })) as SystemSetting[];
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
    queryKey: ['settings', 'lite'],
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchLiteSettingsCached()) as SystemSetting[];
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
      const res = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      invalidateSettingsCache();
      return (await res.json()) as SystemSetting;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'settings',
      });
    },
  });
}

export function useUpdateSettingsBulk(): UseMutationResult<
  Response[],
  Error,
  Array<{ key: string; value: string }>
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>,
    ): Promise<Response[]> => {
      const responses = await Promise.all(
        payloads.map((payload) =>
          fetch('/api/settings', {
            method: 'POST',
            credentials: 'include',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
          }),
        ),
      );
      if (responses.some((res) => !res.ok)) {
        throw new Error('Failed to update settings');
      }
      invalidateSettingsCache();
      return responses;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'settings',
      });
    },
  });
}
