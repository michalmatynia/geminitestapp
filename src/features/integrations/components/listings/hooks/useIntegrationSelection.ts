'use client';

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

import {
  BASE_INTEGRATION_SLUGS,
  TRADERA_INTEGRATION_SLUGS,
  isBaseIntegrationSlug,
  normalizeIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type {
  BaseDefaultConnectionPreferenceResponse,
  IntegrationWithConnections,
  TraderaDefaultConnectionPreferenceResponse,
} from '@/shared/contracts/integrations';
import { api } from '@/shared/lib/api-client';
import { createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const INTEGRATION_SELECTION_GC_TIME_MS = 30 * 60 * 1000;

const matchesFilterIntegrationSlug = (
  integrationSlug: string,
  filterIntegrationSlug: string
): boolean => {
  if (!filterIntegrationSlug) return true;

  const normalizedIntegrationSlug = normalizeIntegrationSlug(integrationSlug);
  if (BASE_INTEGRATION_SLUGS.has(filterIntegrationSlug)) {
    return BASE_INTEGRATION_SLUGS.has(normalizedIntegrationSlug);
  }
  if (TRADERA_INTEGRATION_SLUGS.has(filterIntegrationSlug)) {
    return TRADERA_INTEGRATION_SLUGS.has(normalizedIntegrationSlug);
  }
  return normalizedIntegrationSlug === filterIntegrationSlug;
};

const integrationSelectionKeys = {
  defaultConnection: QUERY_KEYS.integrations.selection.defaultConnection(),
  traderaDefaultConnection: QUERY_KEYS.integrations.selection.traderaDefaultConnection(),
  // Reuse canonical integrations cache key to avoid duplicate fetches in modal flows.
  withConnections: QUERY_KEYS.integrations.withConnections(),
} as const;
export const integrationSelectionQueryKeys = integrationSelectionKeys;

export const fetchPreferredBaseConnection = async (): Promise<BaseDefaultConnectionPreferenceResponse> => {
  return await api.get<BaseDefaultConnectionPreferenceResponse>(
    '/api/v2/integrations/exports/base/default-connection'
  );
};

export const fetchPreferredTraderaConnection =
  async (): Promise<TraderaDefaultConnectionPreferenceResponse> => {
    return await api.get<TraderaDefaultConnectionPreferenceResponse>(
      '/api/v2/integrations/exports/tradera/default-connection'
    );
  };

export const fetchIntegrationsWithConnections = async (): Promise<IntegrationWithConnections[]> => {
  return await api.get<IntegrationWithConnections[]>('/api/v2/integrations/with-connections');
};

// Why: Integration selection has complex side effects:
// - Loading integrations on mount
// - Applying initial selection from props
// - Clearing dependent state when integration changes
// Extracting prevents callback hell and makes logic reusable across modals.
export function useIntegrationSelection(
  initialIntegrationId?: string | null,
  initialConnectionId?: string | null,
  options?: { filterIntegrationSlug?: string | null | undefined }
): {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedIntegrationId: string;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections | undefined;
  isBaseComIntegration: boolean;
  isTraderaIntegration: boolean;
  setSelectedIntegrationId: Dispatch<SetStateAction<string>>;
  setSelectedConnectionId: Dispatch<SetStateAction<string>>;
} {
  const normalizedFilterIntegrationSlug = normalizeIntegrationSlug(
    options?.filterIntegrationSlug ?? null
  );
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(
    initialIntegrationId ?? ''
  );
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    initialConnectionId ?? ''
  );
  const initializedRef = useRef(false);

  const results = createMultiQueryV2({
    queries: [
      {
        queryKey: normalizeQueryKey(integrationSelectionKeys.defaultConnection),
        queryFn: fetchPreferredBaseConnection,
        staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
        gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'integrations.hooks.useIntegrationSelection.preferredConnection',
          operation: 'detail',
          resource: 'integrations.selection.preferred-connection',
          description: 'Loads integrations selection preferred connection.',
          domain: 'integrations',
          tags: ['integrations', 'selection', 'preferred-connection'],
        },
      },
      {
        queryKey: normalizeQueryKey(integrationSelectionKeys.traderaDefaultConnection),
        queryFn: fetchPreferredTraderaConnection,
        staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
        gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'integrations.hooks.useIntegrationSelection.preferredTraderaConnection',
          operation: 'detail',
          resource: 'integrations.selection.preferred-tradera-connection',
          description: 'Loads integrations selection preferred Tradera connection.',
          domain: 'integrations',
          tags: ['integrations', 'selection', 'preferred-tradera-connection'],
        },
      },
      {
        queryKey: normalizeQueryKey(integrationSelectionKeys.withConnections),
        queryFn: fetchIntegrationsWithConnections,
        staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
        gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'integrations.hooks.useIntegrationSelection.integrationsWithConnections',
          operation: 'list',
          resource: 'integrations.with-connections',
          description: 'Loads integrations with connections.',
          domain: 'integrations',
          tags: ['integrations', 'selection', 'list'],
        },
      },
    ] as const,
  });

  const preferredConnectionQuery = results[0];
  const preferredTraderaConnectionQuery = results[1];
  const integrationsQuery = results[2];
  const preferredBaseConnectionData =
    (preferredConnectionQuery?.data as BaseDefaultConnectionPreferenceResponse | undefined) ?? null;
  const preferredTraderaConnectionData =
    (preferredTraderaConnectionQuery?.data as TraderaDefaultConnectionPreferenceResponse | undefined) ??
    null;
  const integrationsData = integrationsQuery?.data;

  const loading = Boolean(integrationsQuery?.isPending && !integrationsData);
  const integrations = useMemo((): IntegrationWithConnections[] => {
    const data = (integrationsData as IntegrationWithConnections[] | undefined) ?? [];
    return Array.isArray(data)
      ? data.filter(
          (i: IntegrationWithConnections) =>
            i.connections.length > 0 &&
            matchesFilterIntegrationSlug(i.slug ?? '', normalizedFilterIntegrationSlug)
        )
      : [];
  }, [integrationsData, normalizedFilterIntegrationSlug]);

  const preferredBaseConnectionId = preferredBaseConnectionData?.connectionId ?? null;
  const preferredTraderaConnectionId = preferredTraderaConnectionData?.connectionId ?? null;

  useEffect(() => {
    if (initializedRef.current || loading || integrations.length === 0) return;

    initializedRef.current = true;

    if (
      initialIntegrationId &&
      integrations.some(
        (integration: IntegrationWithConnections) => integration.id === initialIntegrationId
      )
    ) {
      setSelectedIntegrationId(initialIntegrationId);
      if (initialConnectionId) {
        setSelectedConnectionId(initialConnectionId);
      }
      return;
    }

    const firstIntegration = integrations[0];
    if (!firstIntegration) return;
    setSelectedIntegrationId(firstIntegration.id);
  }, [initialConnectionId, initialIntegrationId, integrations, loading]);

  useEffect(() => {
    if (!selectedIntegrationId || integrations.length === 0) return;

    const integration = integrations.find(
      (entry: IntegrationWithConnections) => entry.id === selectedIntegrationId
    );
    if (!integration) return;
    const integrationSlug = (integration.slug ?? '').toLowerCase();
    const preferredConnectionId = isBaseIntegrationSlug(integrationSlug)
      ? preferredBaseConnectionId
      : isTraderaBrowserIntegrationSlug(integrationSlug)
        ? preferredTraderaConnectionId
        : null;

    const connectionIds =
      integration.connections?.map((conn: { id: string }): string => conn.id) ?? [];
    if (connectionIds.length === 0) {
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }

    if (selectedConnectionId && connectionIds.includes(selectedConnectionId)) {
      return;
    }

    if (initialConnectionId && connectionIds.includes(initialConnectionId)) {
      setSelectedConnectionId(initialConnectionId);
      return;
    }

    if (preferredConnectionId && connectionIds.includes(preferredConnectionId)) {
      setSelectedConnectionId(preferredConnectionId);
      return;
    }

    const fallbackConnectionId = connectionIds[0] ?? '';
    if (selectedConnectionId !== fallbackConnectionId) {
      setSelectedConnectionId(fallbackConnectionId);
    }
  }, [
    initialConnectionId,
    integrations,
    preferredBaseConnectionId,
    preferredTraderaConnectionId,
    selectedConnectionId,
    selectedIntegrationId,
  ]);

  const selectedIntegration = (integrations || []).find(
    (i: IntegrationWithConnections) => i.id === selectedIntegrationId
  );
  const isBaseComIntegration = isBaseIntegrationSlug(selectedIntegration?.slug);
  const isTraderaIntegration = TRADERA_INTEGRATION_SLUGS.has(
    (selectedIntegration?.slug ?? '').toLowerCase()
  );

  return {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    isTraderaIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  };
}
