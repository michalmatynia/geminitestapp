'use client';

import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2, useUpdateMutationV2 } from '@/shared/lib/query-factories-v2';

type IntegrationSettingsResponse = {
  settings: Record<string, string>;
};

type IntegrationSettingsUpdate = {
  key: string;
  value: string;
};

const integrationSettingsKeys = {
  all: ['integrations', 'settings'] as const,
  map: (keys?: readonly string[]) =>
    ['integrations', 'settings', keys ? [...keys].sort().join(',') : 'all'] as const,
};

const buildEndpoint = (keys?: readonly string[]): string => {
  if (!keys || keys.length === 0) return '/api/v2/integrations/settings';
  const params = new URLSearchParams({ keys: [...keys].join(',') });
  return `/api/v2/integrations/settings?${params.toString()}`;
};

const responseToMap = (response: IntegrationSettingsResponse): Map<string, string> =>
  new Map(Object.entries(response.settings));

export function useIntegrationSettingsMap(keys?: readonly string[]): SingleQuery<Map<string, string>> {
  const queryKey = integrationSettingsKeys.map(keys);
  return useSingleQueryV2({
    id: keys ? keys.join(',') : 'all',
    queryKey,
    queryFn: async (): Promise<Map<string, string>> =>
      responseToMap(
        await api.get<IntegrationSettingsResponse>(buildEndpoint(keys), { cache: 'no-store' })
      ),
    meta: {
      source: 'integrations.hooks.useIntegrationSettingsMap',
      operation: 'detail',
      resource: 'integrations.settings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'settings'],
      description: 'Loads global integration settings.',
    },
  });
}

export function useUpdateIntegrationSettingsBulk(): MutationResult<
  Map<string, string>,
  IntegrationSettingsUpdate[]
> {
  const mutationKey = integrationSettingsKeys.all;
  return useUpdateMutationV2({
    mutationFn: async (settings: IntegrationSettingsUpdate[]): Promise<Map<string, string>> =>
      responseToMap(
        await api.post<IntegrationSettingsResponse>('/api/v2/integrations/settings', { settings })
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpdateIntegrationSettingsBulk',
      operation: 'update',
      resource: 'integrations.settings',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'settings', 'save'],
      description: 'Updates global integration settings.',
    },
    invalidate: async (queryClient) => {
      await queryClient.invalidateQueries({ queryKey: integrationSettingsKeys.all });
    },
  });
}
