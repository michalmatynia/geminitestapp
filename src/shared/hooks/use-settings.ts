import {
  fetchSettingsCached,
  fetchLiteSettingsCached,
  invalidateSettingsCache,
  type SettingsScope,
} from '@/shared/api/settings-client';
import type { SystemSetting } from '@/shared/contracts/settings';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export type { SystemSetting };

const selectSettingsMap = (data: SystemSetting[]): Map<string, string> =>
  new Map(data.map((item) => [item.key, item.value]));

const fetchSettingsWithFallback = async (
  scope: SettingsScope,
  source: string
): Promise<SystemSetting[]> => {
  try {
    return await fetchSettingsCached({ scope });
  } catch (error) {
    logClientCatch(error, {
      source,
      action: 'fetchSettings',
      scope,
      level: 'warn',
    });
    return [];
  }
};

const fetchLiteSettingsWithFallback = async (): Promise<SystemSetting[]> => {
  try {
    return await fetchLiteSettingsCached();
  } catch (error) {
    logClientCatch(error, {
      source: 'useLiteSettingsMap',
      action: 'fetchLiteSettings',
      level: 'warn',
    });
    return [];
  }
};

export function useSettings(options?: {
  scope?: SettingsScope;
  enabled?: boolean;
}): ListQuery<SystemSetting, SystemSetting[]> {
  const scope = options?.scope ?? 'light';
  return createListQueryV2<SystemSetting, SystemSetting[]>({
    queryKey: QUERY_KEYS.settings.scope(scope),
    queryFn: async (): Promise<SystemSetting[]> =>
      await fetchSettingsWithFallback(scope, 'useSettings'),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'shared.hooks.useSettings',
      operation: 'list',
      resource: 'settings',
      domain: 'observability',
      tags: ['settings', scope],
      description: 'Loads settings for the requested scope.',
    },
  });
}

export function useSettingsMap(options?: {
  scope?: SettingsScope;
  enabled?: boolean;
}): SingleQuery<Map<string, string>> {
  const scope = options?.scope ?? 'light';
  return createSingleQueryV2<SystemSetting[], Map<string, string>>({
    id: `settings-map:${scope}`,
    queryKey: QUERY_KEYS.settings.scope(scope),
    queryFn: async (): Promise<SystemSetting[]> =>
      await fetchSettingsWithFallback(scope, 'useSettingsMap'),
    select: selectSettingsMap,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'shared.hooks.useSettingsMap',
      operation: 'detail',
      resource: 'settings',
      domain: 'observability',
      tags: ['settings', 'map', scope],
      description: 'Loads the requested settings scope as a key-value map.',
    },
  });
}

export function useLiteSettingsMap(options?: {
  enabled?: boolean;
}): SingleQuery<Map<string, string>> {
  return createSingleQueryV2<SystemSetting[], Map<string, string>>({
    id: 'settings-map:lite',
    queryKey: QUERY_KEYS.settings.scope('lite'),
    queryFn: fetchLiteSettingsWithFallback,
    select: selectSettingsMap,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'shared.hooks.useLiteSettingsMap',
      operation: 'detail',
      resource: 'settings',
      domain: 'observability',
      tags: ['settings', 'map', 'lite'],
      description: 'Loads the lite settings scope as a key-value map.',
    },
  });
}

export function useUpdateSetting(): MutationResult<SystemSetting, { key: string; value: string }> {
  return createUpdateMutationV2<SystemSetting, { key: string; value: string }>({
    mutationKey: QUERY_KEYS.settings.mutation('update-setting'),
    mutationFn: async ({ key, value }: { key: string; value: string }): Promise<SystemSetting> => {
      const res = await api.post<SystemSetting>('/api/settings', { key, value });
      invalidateSettingsCache();
      return res;
    },
    invalidate: (queryClient) => invalidateAllSettings(queryClient),
    meta: {
      source: 'shared.hooks.useUpdateSetting',
      operation: 'update',
      resource: 'settings',
      domain: 'observability',
      tags: ['settings', 'update'],
      description: 'Updates a single system setting.',
    },
  });
}

export function useUpdateSettingsBulk(): MutationResult<
  SystemSetting[],
  Array<{ key: string; value: string }>
  > {
  return createUpdateMutationV2<SystemSetting[], Array<{ key: string; value: string }>>({
    mutationKey: QUERY_KEYS.settings.mutation('update-settings-bulk'),
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>
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
    invalidate: (queryClient) => invalidateAllSettings(queryClient),
    meta: {
      source: 'shared.hooks.useUpdateSettingsBulk',
      operation: 'update',
      resource: 'settings',
      domain: 'observability',
      tags: ['settings', 'bulk-update'],
      description: 'Updates multiple system settings in sequence.',
    },
  });
}
