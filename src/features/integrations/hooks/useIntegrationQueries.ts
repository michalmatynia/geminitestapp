'use client';

import { z } from 'zod';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import { normalizePlaywrightPersonas } from '@/features/playwright/utils/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import {
  importExportTemplateSchema,
  type ImportExportTemplate,
  integrationSchema,
  integrationConnectionSchema,
} from '@/shared/contracts/integrations';
import type {
  Integration,
  IntegrationConnection,
  IntegrationWithConnections,
  BaseInventory,
} from '@/shared/contracts/integrations';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { api, ApiError } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  type QueryDescriptorV2,
} from '@/shared/lib/query-factories-v2';
import { integrationKeys, playwrightKeys } from '@/shared/lib/query-key-exports';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export function useIntegrations(): ListQuery<Integration> {
  const queryKey = integrationKeys.all;
  const queryFn = async (): Promise<Integration[]> => {
    const data = await api.get<Integration[]>('/api/v2/integrations');
    return z.array(integrationSchema).parse(data);
  };

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

export function useIntegrationConnections(
  integrationId?: string
): ListQuery<IntegrationConnection> {
  const queryKey = integrationKeys.connections(integrationId);
  const queryFn = async (): Promise<IntegrationConnection[]> => {
    if (!integrationId) return [];
    const data = await api.get<IntegrationConnection[]>(
      `/api/v2/integrations/${integrationId}/connections`
    );
    return z.array(integrationConnectionSchema).parse(data);
  };

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

export function useConnectionSession(
  connectionId?: string,
  options?: { enabled?: boolean }
): SingleQuery<unknown> {
  const queryKey = integrationKeys.connectionSession(connectionId);
  const queryFn = async (): Promise<unknown> =>
    api.get<unknown>(`/api/v2/integrations/connections/${connectionId}/session`);

  return createSingleQueryV2({
    id: connectionId,
    queryKey,
    queryFn,
    enabled: (options?.enabled ?? true) && !!connectionId,
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

export function useIntegrationsWithConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  const queryFn = async (): Promise<IntegrationWithConnections[]> =>
    api.get<IntegrationWithConnections[]>('/api/v2/integrations/with-connections');

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

  return createListQueryV2({
    queryKey,
    queryFn,
    meta: {
      source: 'integrations.hooks.usePlaywrightPersonas',
      operation: 'list',
      resource: 'playwright.personas',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'personas'],
    },
  });
}

export function useExportTemplates(): ListQuery<ImportExportTemplate> {
  const queryKey = integrationKeys.exportTemplates();
  const queryFn = async (): Promise<ImportExportTemplate[]> => {
    const data = await api.get<ImportExportTemplate[]>('/api/v2/templates/export');
    return z.array(importExportTemplateSchema).parse(data);
  };

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

export function useActiveExportTemplate(): SingleQuery<{ templateId?: string | null }> {
  const queryKey = integrationKeys.activeExportTemplate();
  const queryFn = async (): Promise<{ templateId?: string | null }> =>
    api.get<{ templateId?: string | null }>('/api/v2/integrations/exports/base/active-template');

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

export function useDefaultExportInventory(): SingleQuery<{ inventoryId?: string | null }> {
  const queryKey = integrationKeys.defaultExportInventory();
  const queryFn = async (): Promise<{ inventoryId?: string | null }> =>
    api.get<{ inventoryId?: string | null }>('/api/v2/integrations/exports/base/default-inventory');

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

export function useDefaultExportConnection(): SingleQuery<{ connectionId?: string | null }> {
  const queryKey = integrationKeys.selection.defaultConnection();
  const queryFn = async (): Promise<{ connectionId?: string | null }> =>
    api.get<{ connectionId?: string | null }>('/api/v2/integrations/exports/base/default-connection');

  return createSingleQueryV2({
    id: 'default-export-connection',
    queryKey,
    queryFn,
    meta: {
      source: 'integrations.hooks.useDefaultExportConnection',
      operation: 'detail',
      resource: 'integrations.default-export-connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'connection'],
    },
  });
}

export function useBaseInventories(
  connectionId: string,
  enabled: boolean = true
): ListQuery<BaseInventory> {
  const queryKey = integrationKeys.baseInventories(connectionId);
  const queryFn = async (): Promise<BaseInventory[]> => {
    const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>(
      '/api/v2/integrations/imports/base',
      {
        action: 'inventories',
        connectionId,
      }
    );
    if (data.error) throw new ApiError(data.error, 400);
    return Array.isArray(data.inventories) ? data.inventories : [];
  };

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

// --- Query Options (Needed for useQueries compositions) ---

export const getExportTemplatesQueryOptions = (): QueryDescriptorV2<ImportExportTemplate[]> => {
  const queryKey = integrationKeys.exportTemplates();
  return {
    queryKey,
    queryFn: async (): Promise<ImportExportTemplate[]> => {
      const data = await api.get<ImportExportTemplate[]>('/api/v2/templates/export');
      return z.array(importExportTemplateSchema).parse(data);
    },
    staleTime: 5 * 60 * 1000,
    meta: {
      source: 'integrations.queries.getExportTemplatesOptions',
      operation: 'list' as const,
      resource: 'integrations.export-templates',
      domain: 'integrations' as const,
      queryKey,
      tags: ['integrations', 'export-templates', 'options'],
    },
  };
};

export const getActiveExportTemplateQueryOptions = (): QueryDescriptorV2<{
  templateId?: string | null;
}> => {
  const queryKey = integrationKeys.activeExportTemplate();
  return {
    queryKey,
    queryFn: () =>
      api.get<{ templateId?: string | null }>('/api/v2/integrations/exports/base/active-template'),
    staleTime: 5 * 60 * 1000,
    meta: {
      source: 'integrations.queries.getActiveExportTemplateOptions',
      operation: 'detail' as const,
      resource: 'integrations.active-export-template',
      domain: 'integrations' as const,
      queryKey,
      tags: ['integrations', 'export-template', 'options'],
    },
  };
};

export const getDefaultExportInventoryQueryOptions = (): QueryDescriptorV2<{
  inventoryId?: string | null;
}> => {
  const queryKey = integrationKeys.defaultExportInventory();
  return {
    queryKey,
    queryFn: () =>
      api.get<{ inventoryId?: string | null }>('/api/v2/integrations/exports/base/default-inventory'),
    staleTime: 5 * 60 * 1000,
    meta: {
      source: 'integrations.queries.getDefaultExportInventoryOptions',
      operation: 'detail' as const,
      resource: 'integrations.default-export-inventory',
      domain: 'integrations' as const,
      queryKey,
      tags: ['integrations', 'inventory', 'options'],
    },
  };
};

export const getBaseInventoriesQueryOptions = (
  connectionId: string,
  enabled: boolean = true
): QueryDescriptorV2<BaseInventory[]> => {
  const queryKey = integrationKeys.baseInventories(connectionId);
  return {
    queryKey,
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>(
        '/api/v2/integrations/imports/base',
        {
          action: 'inventories',
          connectionId,
        }
      );
      if (data.error) throw new ApiError(data.error, 400);
      return Array.isArray(data.inventories) ? data.inventories : [];
    },
    enabled: enabled && !!connectionId,
    meta: {
      source: 'integrations.queries.getBaseInventoriesOptions',
      operation: 'list' as const,
      resource: 'integrations.base-inventories',
      domain: 'integrations' as const,
      queryKey,
      tags: ['integrations', 'inventories', 'options'],
    },
  };
};
