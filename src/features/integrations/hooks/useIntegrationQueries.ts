'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';

import type { BaseInventory } from '@/features/data-import-export';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { normalizePlaywrightPersonas } from '@/features/playwright/utils/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import {
  importExportTemplateSchema
} from '@/shared/contracts/data-import-export';
import { 
  integrationSchema, 
  integrationConnectionSchema
} from '@/shared/contracts/integrations';
import { api, ApiError } from '@/shared/lib/api-client';
import { createQueryHook } from '@/shared/lib/api-hooks';
import { integrationKeys, playwrightKeys } from '@/shared/lib/query-key-exports';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getIntegrationConnectionsQueryKey } from './integrationCache';

export const useIntegrations = createQueryHook({
  queryKeyFactory: () => integrationKeys.all,
  endpoint: '/api/integrations',
  schema: z.array(integrationSchema),
});

export const useIntegrationConnections = createQueryHook({
  queryKeyFactory: (integrationId?: string) => getIntegrationConnectionsQueryKey(integrationId),
  endpoint: (integrationId?: string) => `/api/integrations/${integrationId}/connections`,
  schema: z.array(integrationConnectionSchema),
});

export const useConnectionSession = createQueryHook({
  queryKeyFactory: (connectionId?: string) => integrationKeys.connectionSession(connectionId),
  endpoint: (connectionId?: string) => `/api/integrations/connections/${connectionId}/session`,
  staleTime: 0,
});

export const useIntegrationsWithConnections = createQueryHook({
  queryKeyFactory: () => integrationKeys.withConnections(),
  endpoint: '/api/integrations/with-connections',
});

export function usePlaywrightPersonas(): UseQueryResult<PlaywrightPersona[]> {
  return useQuery({
    queryKey: playwrightKeys.personas(),
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
  queryKeyFactory: () => integrationKeys.exportTemplates(),
  endpoint: '/api/integrations/export-templates',
  schema: z.array(importExportTemplateSchema),
});

export const useActiveExportTemplate = createQueryHook({
  queryKeyFactory: () => integrationKeys.activeExportTemplate(),
  endpoint: '/api/integrations/exports/base/active-template',
});

export const useDefaultExportInventory = createQueryHook({
  queryKeyFactory: () => integrationKeys.defaultExportInventory(),
  endpoint: '/api/integrations/exports/base/default-inventory',
});

export function useBaseInventories(connectionId: string, enabled: boolean = true): UseQueryResult<BaseInventory[]> {
  return useQuery({
    queryKey: integrationKeys.baseInventories(connectionId),
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
