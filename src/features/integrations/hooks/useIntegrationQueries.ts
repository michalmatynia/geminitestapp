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
import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { integrationKeys, playwrightKeys } from '@/shared/lib/query-key-exports';
import { isTanstackFactoryV2Enabled } from '@/shared/lib/tanstack-factory-flags';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getIntegrationConnectionsQueryKey } from './integrationCache';

const USE_V2_INTEGRATION_FACTORIES = isTanstackFactoryV2Enabled('integrations');

export function useIntegrations(): ListQuery<IntegrationDto> {
  const queryKey = integrationKeys.all;
  const queryFn = async (): Promise<IntegrationDto[]> => {
    const data = await api.get<IntegrationDto[]>('/api/integrations');
    return z.array(integrationSchema).parse(data);
  };

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.useIntegrations',
        operation: 'list',
        resource: 'integrations',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'list'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
  });
}

export function useIntegrationConnections(integrationId?: string): ListQuery<IntegrationConnectionDto> {
  const queryKey = getIntegrationConnectionsQueryKey(integrationId);
  const queryFn = async (): Promise<IntegrationConnectionDto[]> => {
    if (!integrationId) return [];
    const data = await api.get<IntegrationConnectionDto[]>(`/api/integrations/${integrationId}/connections`);
    return z.array(integrationConnectionSchema).parse(data);
  };

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      enabled: !!integrationId,
      meta: {
        source: 'integrations.hooks.useIntegrationConnections',
        operation: 'list',
        resource: 'integrations.connections',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'connections'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
    enabled: !!integrationId,
  });
}

export function useConnectionSession(connectionId?: string): SingleQuery<unknown> {
  const queryKey = integrationKeys.connectionSession(connectionId);
  const queryFn = async (): Promise<unknown> =>
    api.get<unknown>(`/api/integrations/connections/${connectionId}/session`);

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createSingleQueryV2({
      id: connectionId,
      queryKey,
      queryFn,
      enabled: !!connectionId,
      staleTime: 0,
      meta: {
        source: 'integrations.hooks.useConnectionSession',
        operation: 'detail',
        resource: 'integrations.connection.session',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'session'],
      },
    });
  }

  return createSingleQuery({
    id: connectionId,
    queryKey,
    queryFn,
    enabled: !!connectionId,
    staleTime: 0,
  });
}

export function useIntegrationsWithConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  const queryFn = async (): Promise<IntegrationWithConnections[]> =>
    api.get<IntegrationWithConnections[]>('/api/integrations/with-connections');

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.useIntegrationsWithConnections',
        operation: 'list',
        resource: 'integrations.with-connections',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'with-connections'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
  });
}

export function usePlaywrightPersonas(): ListQuery<PlaywrightPersona> {
  const queryKey = playwrightKeys.personas();
  const queryFn = async (): Promise<PlaywrightPersona[]> => {
    const data = await fetchSettingsCached();
    const map = new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
    const stored = parseJsonSetting<PlaywrightPersona[]>(
      map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY),
      []
    );
    return normalizePlaywrightPersonas(stored);
  };

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.usePlaywrightPersonas',
        operation: 'list',
        resource: 'playwright.personas',
        domain: 'integrations',
        queryKey,
        tags: ['playwright', 'personas'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
  });
}

export function useExportTemplates(): ListQuery<ImportExportTemplateDto> {
  const queryKey = integrationKeys.exportTemplates();
  const queryFn = async (): Promise<ImportExportTemplateDto[]> => {
    const data = await api.get<ImportExportTemplateDto[]>('/api/integrations/export-templates');
    return z.array(importExportTemplateSchema).parse(data);
  };

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.useExportTemplates',
        operation: 'list',
        resource: 'integrations.export-templates',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'export-templates'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
  });
}

export function useActiveExportTemplate(): SingleQuery<{ templateId?: string | null }> {
  const queryKey = integrationKeys.activeExportTemplate();
  const queryFn = async (): Promise<{ templateId?: string | null }> =>
    api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template');

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createSingleQueryV2({
      id: 'active-export-template',
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.useActiveExportTemplate',
        operation: 'detail',
        resource: 'integrations.active-export-template',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'export-template'],
      },
    });
  }

  return createSingleQuery({
    id: 'active-export-template',
    queryKey,
    queryFn,
  });
}

export function useDefaultExportInventory(): SingleQuery<{ inventoryId?: string | null }> {
  const queryKey = integrationKeys.defaultExportInventory();
  const queryFn = async (): Promise<{ inventoryId?: string | null }> =>
    api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory');

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createSingleQueryV2({
      id: 'default-export-inventory',
      queryKey,
      queryFn,
      meta: {
        source: 'integrations.hooks.useDefaultExportInventory',
        operation: 'detail',
        resource: 'integrations.default-export-inventory',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'inventory'],
      },
    });
  }

  return createSingleQuery({
    id: 'default-export-inventory',
    queryKey,
    queryFn,
  });
}

export function useBaseInventories(connectionId: string, enabled: boolean = true): ListQuery<BaseInventory> {
  const queryKey = integrationKeys.baseInventories(connectionId);
  const queryFn = async (): Promise<BaseInventory[]> => {
    const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>('/api/integrations/imports/base', {
      action: 'inventories',
      connectionId,
    });
    if (data.error) throw new ApiError(data.error, 400);
    return Array.isArray(data.inventories) ? data.inventories : [];
  };

  if (USE_V2_INTEGRATION_FACTORIES) {
    return createListQueryV2({
      queryKey,
      queryFn,
      enabled: enabled && !!connectionId,
      meta: {
        source: 'integrations.hooks.useBaseInventories',
        operation: 'list',
        resource: 'integrations.base-inventories',
        domain: 'integrations',
        queryKey,
        tags: ['integrations', 'inventories'],
      },
    });
  }

  return createListQuery({
    queryKey,
    queryFn,
    enabled: enabled && !!connectionId,
  });
}

// --- Query Options (Needed for useQueries compositions) ---

export const getExportTemplatesQueryOptions = () => ({
  queryKey: integrationKeys.exportTemplates(),
  queryFn: async (): Promise<ImportExportTemplateDto[]> => {
    const data = await api.get<ImportExportTemplateDto[]>('/api/integrations/export-templates');
    return z.array(importExportTemplateSchema).parse(data);
  },
  staleTime: 5 * 60 * 1000,
});

export const getActiveExportTemplateQueryOptions = () => ({
  queryKey: integrationKeys.activeExportTemplate(),
  queryFn: () => api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template'),
  staleTime: 5 * 60 * 1000,
});

export const getDefaultExportInventoryQueryOptions = () => ({
  queryKey: integrationKeys.defaultExportInventory(),
  queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
  staleTime: 5 * 60 * 1000,
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
});
