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
import { integrationKeys, playwrightKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery, SingleQuery } from '@/shared/types/query-result-types';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { getIntegrationConnectionsQueryKey } from './integrationCache';

export function useIntegrations(): ListQuery<IntegrationDto> {
  return createListQuery({
    queryKey: integrationKeys.all,
    queryFn: async (): Promise<IntegrationDto[]> => {
      const data = await api.get<IntegrationDto[]>('/api/integrations');
      return z.array(integrationSchema).parse(data);
    },
  });
}

export function useIntegrationConnections(integrationId?: string): ListQuery<IntegrationConnectionDto> {
  return createListQuery({
    queryKey: getIntegrationConnectionsQueryKey(integrationId),
    queryFn: async (): Promise<IntegrationConnectionDto[]> => {
      if (!integrationId) return [];
      const data = await api.get<IntegrationConnectionDto[]>(`/api/integrations/${integrationId}/connections`);
      return z.array(integrationConnectionSchema).parse(data);
    },
    enabled: !!integrationId,
  });
}

export function useConnectionSession(connectionId?: string): SingleQuery<unknown> {
  return createSingleQuery({
    id: connectionId,
    queryKey: integrationKeys.connectionSession(connectionId),
    queryFn: () => api.get<unknown>(`/api/integrations/connections/${connectionId}/session`),
    enabled: !!connectionId,
    staleTime: 0,
  });
}

export function useIntegrationsWithConnections(): ListQuery<IntegrationWithConnections> {
  return createListQuery({
    queryKey: integrationKeys.withConnections(),
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/integrations/with-connections'),
  });
}

export function usePlaywrightPersonas(): ListQuery<PlaywrightPersona> {
  return createListQuery({
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

export function useExportTemplates(): ListQuery<ImportExportTemplateDto> {
  return createListQuery({
    queryKey: integrationKeys.exportTemplates(),
    queryFn: async (): Promise<ImportExportTemplateDto[]> => {
      const data = await api.get<ImportExportTemplateDto[]>('/api/integrations/export-templates');
      return z.array(importExportTemplateSchema).parse(data);
    },
  });
}

export function useActiveExportTemplate(): SingleQuery<{ templateId?: string | null }> {
  return createSingleQuery({
    id: 'active-export-template',
    queryKey: () => integrationKeys.activeExportTemplate(),
    queryFn: () => api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template'),
  });
}

export function useDefaultExportInventory(): SingleQuery<{ inventoryId?: string | null }> {
  return createSingleQuery({
    id: 'default-export-inventory',
    queryKey: () => integrationKeys.defaultExportInventory(),
    queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
  });
}

export function useBaseInventories(connectionId: string, enabled: boolean = true): ListQuery<BaseInventory> {
  return createListQuery({
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
