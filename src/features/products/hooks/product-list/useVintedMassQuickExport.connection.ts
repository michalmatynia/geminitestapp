'use client';

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredVintedConnection,
  integrationSelectionQueryKeys,
  isVintedIntegrationSlug,
} from '@/features/integrations/product-integrations-adapter';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicVintedConnection = IntegrationWithConnections['connections'][number];

type VintedConnectionCandidate = {
  integrationId: string;
  connection: BasicVintedConnection;
};

export type ResolvedVintedQuickExportConnection = {
  integrationId: string;
  connectionId: string;
};

const toResolvedConnection = (
  candidate: VintedConnectionCandidate
): ResolvedVintedQuickExportConnection => ({
  integrationId: candidate.integrationId,
  connectionId: candidate.connection.id,
});

const fetchPreferredConnectionId = async (
  queryClient: QueryClient
): Promise<string | null> => {
  try {
    const preferredConnection = await fetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.vintedDefaultConnection),
      queryFn: fetchPreferredVintedConnection,
      staleTime: 5 * 60 * 1000,
      meta: {
        source: 'products.hooks.useVintedMassQuickExport.resolveConnection',
        operation: 'detail',
        resource: 'integrations.vinted-default-connection',
        domain: 'integrations',
        tags: ['integrations', 'vinted', 'mass-quick-export'],
        description: 'Loads preferred Vinted connection for mass quick export.',
      },
    })();

    return typeof preferredConnection.connectionId === 'string'
      ? preferredConnection.connectionId
      : null;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useVintedMassQuickExport',
      action: 'resolvePreferredConnection',
      level: 'warn',
    });
    return null;
  }
};

const fetchVintedConnectionCandidates = async (
  queryClient: QueryClient
): Promise<VintedConnectionCandidate[]> => {
  const integrations = await fetchQueryV2(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
    queryFn: fetchIntegrationsWithConnections,
    staleTime: 5 * 60 * 1000,
    meta: {
      source: 'products.hooks.useVintedMassQuickExport.resolveConnection',
      operation: 'list',
      resource: 'integrations.with-connections',
      domain: 'integrations',
      tags: ['integrations', 'vinted', 'mass-quick-export'],
      description: 'Loads integrations connections for Vinted mass quick export.',
    },
  })();

  return integrations
    .filter((integration) => isVintedIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      integration.connections.map((connection) => ({
        integrationId: integration.id,
        connection,
      }))
    );
};

const findPreferredCandidate = ({
  candidates,
  preferredConnectionId,
}: {
  candidates: VintedConnectionCandidate[];
  preferredConnectionId: string | null;
}): VintedConnectionCandidate | null => {
  if (preferredConnectionId === null) return null;
  return (
    candidates.find((candidate) => candidate.connection.id === preferredConnectionId) ?? null
  );
};

const pickFallbackCandidate = (
  candidates: VintedConnectionCandidate[]
): VintedConnectionCandidate | null => {
  const [firstCandidate] = [...candidates].sort((left, right) =>
    left.connection.name.localeCompare(right.connection.name)
  );
  return firstCandidate ?? null;
};

const resolveCandidateConnection = ({
  candidates,
  preferredConnectionId,
}: {
  candidates: VintedConnectionCandidate[];
  preferredConnectionId: string | null;
}): ResolvedVintedQuickExportConnection | null => {
  if (candidates.length === 0) return null;

  const preferred = findPreferredCandidate({ candidates, preferredConnectionId });
  const selectedCandidate = preferred ?? pickFallbackCandidate(candidates);
  return selectedCandidate === null ? null : toResolvedConnection(selectedCandidate);
};

export const useResolveVintedQuickExportConnection = (
  queryClient: QueryClient
): (() => Promise<ResolvedVintedQuickExportConnection | null>) =>
  useCallback(async (): Promise<ResolvedVintedQuickExportConnection | null> => {
    const preferredConnectionId = await fetchPreferredConnectionId(queryClient);
    const candidates = await fetchVintedConnectionCandidates(queryClient);
    return resolveCandidateConnection({ candidates, preferredConnectionId });
  }, [queryClient]);
