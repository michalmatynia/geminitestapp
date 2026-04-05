'use client';

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

import {
  TRADERA_INTEGRATION_SLUGS,
  isBaseIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  matchesProductListingsIntegrationScope,
  normalizeProductListingsIntegrationScope,
} from '@/features/integrations/utils/product-listings-recovery';
import type { BaseDefaultConnectionPreferenceResponse, TraderaDefaultConnectionPreferenceResponse } from '@/shared/contracts/integrations/preferences';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
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
  return matchesProductListingsIntegrationScope(integrationSlug, filterIntegrationSlug);
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
  const normalizedFilterIntegrationSlug =
    normalizeProductListingsIntegrationScope(options?.filterIntegrationSlug ?? null)?.toLowerCase() ??
    '';
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(
    initialIntegrationId ?? ''
  );
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    initialConnectionId ?? ''
  );
  const initializedRef = useRef(false);
  const lastAppliedInitialSelectionRef = useRef<{
    integrationId: string | null;
    connectionId: string | null;
  }>({
    integrationId: initialIntegrationId?.trim() || null,
    connectionId: initialConnectionId?.trim() || null,
  });

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
      lastAppliedInitialSelectionRef.current = {
        integrationId: initialIntegrationId.trim() || null,
        connectionId: initialConnectionId?.trim() || null,
      };
      return;
    }

    const firstIntegration = integrations[0];
    if (!firstIntegration) return;
    setSelectedIntegrationId(firstIntegration.id);
    lastAppliedInitialSelectionRef.current = {
      integrationId: initialIntegrationId?.trim() || null,
      connectionId: initialConnectionId?.trim() || null,
    };
  }, [initialConnectionId, initialIntegrationId, integrations, loading]);

  useEffect(() => {
    if (!initializedRef.current || loading || integrations.length === 0) return;

    const normalizedInitialIntegrationId = initialIntegrationId?.trim() || null;
    const normalizedInitialConnectionId = initialConnectionId?.trim() || null;
    const lastAppliedSelection = lastAppliedInitialSelectionRef.current;

    if (
      lastAppliedSelection.integrationId === normalizedInitialIntegrationId &&
      lastAppliedSelection.connectionId === normalizedInitialConnectionId
    ) {
      return;
    }

    lastAppliedInitialSelectionRef.current = {
      integrationId: normalizedInitialIntegrationId,
      connectionId: normalizedInitialConnectionId,
    };

    if (!normalizedInitialIntegrationId) return;

    const integration = integrations.find(
      (entry: IntegrationWithConnections) => entry.id === normalizedInitialIntegrationId
    );
    if (!integration) return;

    if (selectedIntegrationId !== normalizedInitialIntegrationId) {
      setSelectedIntegrationId(normalizedInitialIntegrationId);
    }

    const connectionIds =
      integration.connections?.map((connection: { id: string }): string => connection.id) ?? [];
    if (
      normalizedInitialConnectionId &&
      connectionIds.includes(normalizedInitialConnectionId) &&
      selectedConnectionId !== normalizedInitialConnectionId
    ) {
      setSelectedConnectionId(normalizedInitialConnectionId);
    }
  }, [
    initialConnectionId,
    initialIntegrationId,
    integrations,
    loading,
    selectedConnectionId,
    selectedIntegrationId,
  ]);

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
