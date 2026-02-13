'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';

import type { Template, BaseInventory } from '@/features/data-import-export';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { normalizePlaywrightPersonas } from '@/features/playwright/utils/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import { 
  integrationSchema, 
  integrationConnectionSchema, 
  templateSchema,
  baseInventorySchema
} from '@/shared/contracts/integrations';
import { createQueryHook } from '@/shared/lib/api-hooks';
import { api, ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { Integration, IntegrationConnection } from '@/shared/types/domain/integrations';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getIntegrationConnectionsQueryKey } from './integrationCache';

export const useIntegrations = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.integrations.all,
  endpoint: '/api/integrations',
  schema: z.array(integrationSchema),
});

export const useIntegrationConnections = createQueryHook({
  queryKeyFactory: (integrationId?: string) => getIntegrationConnectionsQueryKey(integrationId),
  endpoint: (integrationId?: string) => `/api/integrations/${integrationId}/connections`,
  schema: z.array(integrationConnectionSchema),
});

export const useConnectionSession = createQueryHook({
  queryKeyFactory: (connectionId?: string) => QUERY_KEYS.integrations.connectionSession(connectionId),
  endpoint: (connectionId?: string) => `/api/integrations/connections/${connectionId}/session`,
  staleTime: 0,
});

export const useIntegrationsWithConnections = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.integrations.withConnections(),
  endpoint: '/api/integrations/with-connections',
});

export function usePlaywrightPersonas(): UseQueryResult<PlaywrightPersona[]> {
  return useQuery({
    queryKey: QUERY_KEYS.playwright.personas(),
    queryFn: async (): Promise<PlaywrightPersona[]> => {
      const data = await fetchSettingsCached();
      const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
      const stored = parseJsonSetting<PlaywrightPersona[]>(
        map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY),
        []
      );
      return normalizePlaywrightPersonas(stored);
    },
  });
}

export const useExportTemplates = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.integrations.exportTemplates(),
  endpoint: '/api/integrations/export-templates',
  schema: z.array(templateSchema),
});

export const useActiveExportTemplate = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.integrations.activeExportTemplate(),
  endpoint: '/api/integrations/exports/base/active-template',
});

export const useDefaultExportInventory = createQueryHook({
  queryKeyFactory: () => QUERY_KEYS.integrations.defaultExportInventory(),
  endpoint: '/api/integrations/exports/base/default-inventory',
});

export function useBaseInventories(connectionId: string, enabled: boolean = true): UseQueryResult<BaseInventory[]> {
  return useQuery({
    queryKey: QUERY_KEYS.integrations.baseInventories(connectionId),
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>('/api/integrations/imports/base', {
        action: 'inventories',
        connectionId,
      });
      if (data.error) throw new ApiError(data.error, 400);
      return Array.isArray(data.inventories) ? data.inventories : [];
    },
    enabled: enabled && !!connectionId,
  });
}
