'use client';

import { z } from 'zod';

import type { BaseInventory } from '@/features/data-import-export';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { normalizePlaywrightPersonas } from '@/features/playwright/utils/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import {
  importExportTemplateSchema,
  type ImportExportTemplateDto
} from '@/shared/contracts/data-import-export';
import { 
  integrationSchema, 
  integrationConnectionSchema,
  type IntegrationDto,
  type IntegrationConnectionDto
} from '@/shared/contracts/integrations';
import { api, ApiError } from '@/shared/lib/api-client';
import { createQueryHook } from '@/shared/lib/api-hooks';
import { createListQuery } from '@/shared/lib/query-factories';
import { integrationKeys, playwrightKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery } from '@/shared/types/query-result-types';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getIntegrationConnectionsQueryKey } from './integrationCache';

export const useIntegrations = createQueryHook<IntegrationDto[]>({
  queryKeyFactory: () => integrationKeys.all,
  endpoint: '/api/integrations',
  schema: z.array(integrationSchema),
});

export const useIntegrationConnections = createQueryHook<IntegrationConnectionDto[], string | undefined>({
  queryKeyFactory: (integrationId?: string) => getIntegrationConnectionsQueryKey(integrationId),
  endpoint: (integrationId?: string) => `/api/integrations/${integrationId}/connections`,
  schema: z.array(integrationConnectionSchema),
});

export const useConnectionSession = createQueryHook<unknown, string | undefined>({
  queryKeyFactory: (connectionId?: string) => integrationKeys.connectionSession(connectionId),
  endpoint: (connectionId?: string) => `/api/integrations/connections/${connectionId}/session`,
  staleTime: 0,
});

export const useIntegrationsWithConnections = createQueryHook<IntegrationWithConnections[]>({
  queryKeyFactory: () => integrationKeys.withConnections(),
  endpoint: '/api/integrations/with-connections',
});

export function usePlaywrightPersonas(): ListQuery<PlaywrightPersona> {
  return createListQuery<PlaywrightPersona>({
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

export const getExportTemplatesQueryOptions = () => ({
  queryKey: integrationKeys.exportTemplates(),
  queryFn: () => api.get<ImportExportTemplateDto[]>('/api/integrations/export-templates'),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export const useExportTemplates = createQueryHook<ImportExportTemplateDto[]>({
  queryKeyFactory: () => integrationKeys.exportTemplates(),
  endpoint: '/api/integrations/export-templates',
  schema: z.array(importExportTemplateSchema),
});

export const getActiveExportTemplateQueryOptions = () => ({
  queryKey: integrationKeys.activeExportTemplate(),
  queryFn: () => api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template'),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export const useActiveExportTemplate = createQueryHook({
  queryKeyFactory: () => integrationKeys.activeExportTemplate(),
  endpoint: '/api/integrations/exports/base/active-template',
});

export const getDefaultExportInventoryQueryOptions = () => ({
  queryKey: integrationKeys.defaultExportInventory(),
  queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export const useDefaultExportInventory = createQueryHook({
  queryKeyFactory: () => integrationKeys.defaultExportInventory(),
  endpoint: '/api/integrations/exports/base/default-inventory',
});

export const getBaseInventoriesQueryOptions = (connectionId: string, enabled: boolean = true) => ({
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
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export function useBaseInventories(connectionId: string, enabled: boolean = true): ListQuery<BaseInventory> {
  return createListQuery<BaseInventory>({
    ...getBaseInventoriesQueryOptions(connectionId, enabled),
    options: getBaseInventoriesQueryOptions(connectionId, enabled),
  });
}
