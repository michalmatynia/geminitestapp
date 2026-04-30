import type { QueryClient } from '@tanstack/react-query';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
  type IntegrationWithConnections,
} from '@/features/integrations/product-integrations-adapter';
import type {
  BaseImportInventoriesPayload,
  BaseImportInventoriesResponse,
} from '@/shared/contracts/integrations/import-export';
import type {
  BaseActiveTemplatePreferenceResponse,
  BaseDefaultConnectionPreferenceResponse,
  BaseDefaultInventoryPreferenceResponse,
} from '@/shared/contracts/integrations/preferences';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  defaultExportInventoryQueryKey,
  INTEGRATION_SELECTION_STALE_TIME_MS,
} from './BaseQuickExportButton.constants';
import { resolveBaseConnectionCandidates } from './BaseQuickExportButton.connections';
import { shouldIgnoreInventoryLookupError } from './BaseQuickExportButton.errors';
import { normalizeInventoryId, resolveFallbackInventoryId } from './BaseQuickExportButton.inventory';
import type { QuickExportContext } from './BaseQuickExportButton.types';

type Toast = ReturnType<typeof useToast>['toast'];

type ResolveBaseQuickExportContextInput = {
  queryClient: QueryClient;
  toast: Toast;
};

type BaseQuickExportDefaults = {
  preferredConnection: BaseDefaultConnectionPreferenceResponse;
  defaultInventory: BaseDefaultInventoryPreferenceResponse;
  integrationsWithConnections: IntegrationWithConnections[];
};

type BaseInventoryLookup = {
  fallbackInventoryId: string;
  availableInventoryIds: Set<string>;
};

const normalizeNullableString = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const fetchPreferredConnection = async (
  queryClient: QueryClient
): Promise<BaseDefaultConnectionPreferenceResponse> =>
  await fetchQueryV2<BaseDefaultConnectionPreferenceResponse>(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
    queryFn: async () => await fetchPreferredBaseConnection(),
    staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
    meta: {
      source: 'products.columns.buttons.BaseQuickExport.resolveContext.preferredConnection',
      operation: 'detail',
      resource: 'integrations.default-connection',
      domain: 'integrations',
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
      tags: ['integrations', 'default-connection', 'fetch'],
      description: 'Loads integrations default connection.',
    },
  })();

const fetchDefaultInventory = async (
  queryClient: QueryClient
): Promise<BaseDefaultInventoryPreferenceResponse> =>
  await fetchQueryV2<BaseDefaultInventoryPreferenceResponse>(queryClient, {
    queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
    queryFn: async () =>
      await api.get<BaseDefaultInventoryPreferenceResponse>(
        '/api/v2/integrations/exports/base/default-inventory'
      ),
    staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
    meta: {
      source: 'products.columns.buttons.BaseQuickExport.resolveContext.defaultInventory',
      operation: 'detail',
      resource: 'integrations.default-inventory',
      domain: 'integrations',
      queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
      tags: ['integrations', 'default-inventory', 'fetch'],
      description: 'Loads integrations default inventory.',
    },
  })();

const fetchIntegrationsWithConnectionsForFallback = async (
  queryClient: QueryClient
): Promise<IntegrationWithConnections[]> => {
  try {
    return await fetchQueryV2<IntegrationWithConnections[]>(queryClient, {
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
      queryFn: async () => await fetchIntegrationsWithConnections(),
      staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
      meta: {
        source: 'products.columns.buttons.BaseQuickExport.resolveContext.integrationsWithConnections',
        operation: 'list',
        resource: 'integrations.with-connections',
        domain: 'integrations',
        queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
        tags: ['integrations', 'with-connections', 'fetch'],
        description: 'Loads integrations with connections for one-click export fallback.',
      },
    })();
  } catch {
    return [];
  }
};

const loadBaseQuickExportDefaults = async (
  queryClient: QueryClient
): Promise<BaseQuickExportDefaults> => {
  const [preferredConnection, defaultInventory, integrationsWithConnections] =
    await Promise.all([
      fetchPreferredConnection(queryClient),
      fetchDefaultInventory(queryClient),
      fetchIntegrationsWithConnectionsForFallback(queryClient),
    ]);
  return { preferredConnection, defaultInventory, integrationsWithConnections };
};

const resolveSingleConnectionFallback = (connectionIds: string[]): string =>
  connectionIds.length === 1 ? connectionIds[0] ?? '' : '';

const resolveBaseConnectionId = (
  preferredConnectionId: string,
  integrationsWithConnections: IntegrationWithConnections[]
): string => {
  const availableBaseConnectionIds = resolveBaseConnectionCandidates(integrationsWithConnections);
  if (preferredConnectionId === '') return resolveSingleConnectionFallback(availableBaseConnectionIds);
  if (
    availableBaseConnectionIds.length > 0 &&
    availableBaseConnectionIds.includes(preferredConnectionId) === false
  ) {
    return resolveSingleConnectionFallback(availableBaseConnectionIds);
  }
  return preferredConnectionId;
};

const persistPreferredBaseConnectionIfNeeded = (
  connectionId: string,
  preferredConnectionId: string
): void => {
  if (connectionId === preferredConnectionId) return;
  void api
    .post<BaseDefaultConnectionPreferenceResponse>(
      '/api/v2/integrations/exports/base/default-connection',
      { connectionId }
    )
    .catch(() => undefined);
};

const buildAvailableInventoryIds = (
  inventories: BaseImportInventoriesResponse['inventories']
): Set<string> =>
  new Set(
    (Array.isArray(inventories) ? inventories : [])
      .map((entry) => normalizeInventoryId(entry.id))
      .filter((value) => value.length > 0)
  );

const fetchBaseInventories = async (
  connectionId: string
): Promise<BaseImportInventoriesResponse> =>
  await api.post<BaseImportInventoriesResponse>('/api/v2/integrations/imports/base', {
    action: 'inventories',
    connectionId,
  } satisfies BaseImportInventoriesPayload);

const emptyInventoryLookup = (): BaseInventoryLookup => ({
  fallbackInventoryId: '',
  availableInventoryIds: new Set<string>(),
});

const loadInventoryLookup = async (
  connectionId: string,
  configuredInventoryId: string
): Promise<BaseInventoryLookup> => {
  try {
    const response = await fetchBaseInventories(connectionId);
    return {
      fallbackInventoryId: resolveFallbackInventoryId(response.inventories),
      availableInventoryIds: buildAvailableInventoryIds(response.inventories),
    };
  } catch (error) {
    if (shouldIgnoreInventoryLookupError(error, configuredInventoryId) === false) throw error;
    return emptyInventoryLookup();
  }
};

const resolveSelectedInventoryId = (
  configuredInventoryId: string,
  lookup: BaseInventoryLookup
): string => {
  if (configuredInventoryId === '') return lookup.fallbackInventoryId;
  if (
    lookup.availableInventoryIds.size > 0 &&
    lookup.availableInventoryIds.has(configuredInventoryId) === false
  ) {
    return lookup.fallbackInventoryId;
  }
  return configuredInventoryId;
};

const resolveMissingInventoryMessage = (configuredInventoryId: string): string =>
  configuredInventoryId !== ''
    ? 'Configured Base.com inventory is not available for this connection. Open Export Settings and select a valid inventory.'
    : 'Specific Base.com inventory is not configured. Open Export Settings and set inventory.';

const persistDefaultInventoryIfNeeded = (
  inventoryId: string,
  configuredInventoryId: string
): void => {
  if (inventoryId === configuredInventoryId) return;
  void api
    .post<BaseDefaultInventoryPreferenceResponse>(
      '/api/v2/integrations/exports/base/default-inventory',
      { inventoryId }
    )
    .catch(() => undefined);
};

const fetchScopedTemplateId = async (
  connectionId: string,
  inventoryId: string
): Promise<string> => {
  try {
    const response = await api.get<BaseActiveTemplatePreferenceResponse>(
      `/api/v2/integrations/exports/base/active-template?connectionId=${encodeURIComponent(connectionId)}&inventoryId=${encodeURIComponent(inventoryId)}`
    );
    return normalizeNullableString(response.templateId);
  } catch {
    return '';
  }
};

export const resolveBaseQuickExportContext = async ({
  queryClient,
  toast,
}: ResolveBaseQuickExportContextInput): Promise<QuickExportContext | null> => {
  try {
    const defaults = await loadBaseQuickExportDefaults(queryClient);
    const preferredConnectionId = normalizeNullableString(defaults.preferredConnection.connectionId);
    const connectionId = resolveBaseConnectionId(
      preferredConnectionId,
      defaults.integrationsWithConnections
    );
    if (connectionId === '') {
      toast('Set a default Base.com connection first.', { variant: 'error' });
      return null;
    }

    persistPreferredBaseConnectionIfNeeded(connectionId, preferredConnectionId);
    const configuredInventoryId = normalizeInventoryId(defaults.defaultInventory.inventoryId);
    const inventoryLookup = await loadInventoryLookup(connectionId, configuredInventoryId);
    const inventoryId = resolveSelectedInventoryId(configuredInventoryId, inventoryLookup);
    if (inventoryId === '') {
      toast(resolveMissingInventoryMessage(configuredInventoryId), { variant: 'error' });
      return null;
    }

    persistDefaultInventoryIfNeeded(inventoryId, configuredInventoryId);
    const templateId = await fetchScopedTemplateId(connectionId, inventoryId);
    return { connectionId, inventoryId, templateId };
  } catch (error) {
    logClientError(error);
    toast(
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Failed to load Base.com export defaults.',
      { variant: 'error' }
    );
    return null;
  }
};
