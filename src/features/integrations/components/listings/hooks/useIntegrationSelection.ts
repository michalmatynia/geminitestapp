import { useQueries } from '@tanstack/react-query';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const INTEGRATION_SELECTION_GC_TIME_MS = 30 * 60 * 1000;

const integrationSelectionKeys = {
  defaultConnection: QUERY_KEYS.integrations.selection.defaultConnection(),
  // Reuse canonical integrations cache key to avoid duplicate fetches in modal flows.
  withConnections: QUERY_KEYS.integrations.withConnections(),
} as const;
export const integrationSelectionQueryKeys = integrationSelectionKeys;

export const fetchPreferredBaseConnection = async (): Promise<{ connectionId?: string | null }> => {
  return await api.get<{ connectionId?: string | null }>(
    '/api/integrations/exports/base/default-connection'
  );
};

export const fetchIntegrationsWithConnections = async (): Promise<IntegrationWithConnections[]> => {
  return await api.get<IntegrationWithConnections[]>('/api/integrations/with-connections');
};

// Why: Integration selection has complex side effects:
// - Loading integrations on mount
// - Applying initial selection from props
// - Clearing dependent state when integration changes
// Extracting prevents callback hell and makes logic reusable across modals.
export function useIntegrationSelection(
  initialIntegrationId?: string | null,
  initialConnectionId?: string | null
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
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(
    initialIntegrationId ?? ''
  );
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    initialConnectionId ?? ''
  );
  const initializedRef = useRef(false);

  const results = useQueries({
    queries: [
      {
        queryKey: integrationSelectionKeys.defaultConnection,
        queryFn: fetchPreferredBaseConnection,
        staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
        gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      {
        queryKey: integrationSelectionKeys.withConnections,
        queryFn: fetchIntegrationsWithConnections,
        staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
        gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ],
  });

  const [preferredConnectionQuery, integrationsQuery] = results;

  const loading = integrationsQuery.isPending && !integrationsQuery.data;
  const integrations = useMemo((): IntegrationWithConnections[] => {
    const data = integrationsQuery.data ?? [];
    return Array.isArray(data) ? data.filter((i: IntegrationWithConnections) => i.connections.length > 0) : [];
  }, [integrationsQuery.data]);

  const preferredConnectionId = preferredConnectionQuery.data?.connectionId ?? null;

  useEffect(() => {
    if (initializedRef.current || loading || integrations.length === 0) return;

    initializedRef.current = true;

    if (initialIntegrationId) {
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
    preferredConnectionId,
    selectedConnectionId,
    selectedIntegrationId,
  ]);

  const selectedIntegration = (integrations || []).find((i: IntegrationWithConnections) => i.id === selectedIntegrationId);
  const isBaseComIntegration = ['baselinker', 'base-com', 'base'].includes(
    selectedIntegration?.slug ?? ''
  );
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
