'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { Template, BaseInventory } from '@/features/data-import-export';
import type { Integration, IntegrationConnection } from '@/features/integrations/types/integrations-ui';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { normalizePlaywrightPersonas } from '@/features/playwright/utils/personas';
import { fetchSettingsCached } from '@/shared/api/settings-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export function useIntegrations(): UseQueryResult<Integration[]> {
  return useQuery({
    queryKey: QUERY_KEYS.integrations.all,
    queryFn: () => api.get<Integration[]>('/api/integrations'),
  });
}

export function useIntegrationConnections(integrationId?: string): UseQueryResult<IntegrationConnection[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.connections(), integrationId],
    queryFn: () => 
      integrationId 
        ? api.get<IntegrationConnection[]>(`/api/integrations/${integrationId}/connections`)
        : Promise.resolve([] as IntegrationConnection[]),
    enabled: !!integrationId,
  });
}

export function useConnectionSession(
  connectionId?: string,
  options?: { enabled?: boolean }
): UseQueryResult<Record<string, unknown> | null> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'connection-session', connectionId],
    queryFn: () => 
      connectionId 
        ? api.get<Record<string, unknown>>(`/api/integrations/connections/${connectionId}/session`)
        : Promise.resolve(null),
    enabled: !!connectionId && (options?.enabled ?? true),
    staleTime: 0, // Session cookies might change frequently during testing
  });
}

export function useIntegrationsWithConnections(): UseQueryResult<IntegrationWithConnections[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'with-connections'],
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/integrations/with-connections'),
  });
}

export function usePlaywrightPersonas(): UseQueryResult<PlaywrightPersona[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.settings.all, 'playwright-personas'],
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

export function useExportTemplates(): UseQueryResult<Template[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'export-templates'],
    queryFn: () => api.get<Template[]>('/api/integrations/export-templates'),
  });
}

export function useActiveExportTemplate(): UseQueryResult<{ templateId?: string | null }> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'active-export-template'],
    queryFn: () => api.get<{ templateId?: string | null }>('/api/integrations/exports/base/active-template'),
  });
}

export function useDefaultExportInventory(): UseQueryResult<{ inventoryId?: string | null }> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'default-export-inventory'],
    queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
  });
}

export function useBaseInventories(connectionId: string, enabled: boolean = true): UseQueryResult<BaseInventory[]> {
  return useQuery({
    queryKey: [...QUERY_KEYS.integrations.all, 'base-inventories', connectionId],
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>('/api/integrations/imports/base', {
        action: 'inventories',
        connectionId,
      });
      if (data.error) throw new Error(data.error);
      return Array.isArray(data.inventories) ? data.inventories : [];
    },
    enabled: enabled && !!connectionId,
  });
}