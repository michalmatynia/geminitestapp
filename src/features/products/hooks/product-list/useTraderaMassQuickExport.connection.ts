'use client';

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredTraderaConnection,
  integrationSelectionQueryKeys,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/product-integrations-adapter';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicTraderaConnection = IntegrationWithConnections['connections'][number];

type TraderaConnectionCandidate = {
  integrationId: string;
  connection: BasicTraderaConnection;
};

export type ResolvedTraderaQuickExportConnection = {
  integrationId: string;
  connectionId: string;
};

const hasPlaywrightListingScriptConfigured = (
  connection: BasicTraderaConnection
): boolean => {
  const data = connection as Record<string, unknown>;
  if (typeof data['hasPlaywrightListingScript'] === 'boolean') {
    return data['hasPlaywrightListingScript'];
  }
  const script = data['playwrightListingScript'];
  return typeof script === 'string' && script.trim().length > 0;
};

const hasScriptedConfig = (connection: BasicTraderaConnection): boolean => {
  const data = connection as Record<string, unknown>;
  return (
    data['traderaBrowserMode'] === 'scripted' &&
    hasPlaywrightListingScriptConfigured(connection)
  );
};

const toResolvedConnection = (
  candidate: TraderaConnectionCandidate
): ResolvedTraderaQuickExportConnection => ({
  integrationId: candidate.integrationId,
  connectionId: candidate.connection.id,
});

const fetchPreferredConnectionId = async (
  queryClient: QueryClient
): Promise<string | null> => {
  try {
    const preferredConnection = await fetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
      queryFn: fetchPreferredTraderaConnection,
      staleTime: 5 * 60 * 1000,
      meta: {
        source: 'products.hooks.useTraderaMassQuickExport.resolveConnection',
        operation: 'detail',
        resource: 'integrations.tradera-default-connection',
        domain: 'integrations',
        tags: ['integrations', 'tradera', 'mass-quick-export'],
        description: 'Loads preferred Tradera connection for mass quick export.',
      },
    })();

    return typeof preferredConnection.connectionId === 'string'
      ? preferredConnection.connectionId
      : null;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useTraderaMassQuickExport',
      action: 'resolvePreferredConnection',
      level: 'warn',
    });
    return null;
  }
};

const fetchTraderaConnectionCandidates = async (
  queryClient: QueryClient
): Promise<TraderaConnectionCandidate[]> => {
  const integrations = await fetchQueryV2(queryClient, {
    queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
    queryFn: fetchIntegrationsWithConnections,
    staleTime: 5 * 60 * 1000,
    meta: {
      source: 'products.hooks.useTraderaMassQuickExport.resolveConnection',
      operation: 'list',
      resource: 'integrations.with-connections',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'mass-quick-export'],
      description: 'Loads integrations connections for mass quick export.',
    },
  })();

  return integrations
    .filter((integration) => isTraderaBrowserIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      integration.connections.map((connection) => ({
        integrationId: integration.id,
        connection,
      }))
    );
};

const findPreferredCandidate = ({
  pool,
  preferredConnectionId,
}: {
  pool: TraderaConnectionCandidate[];
  preferredConnectionId: string | null;
}): TraderaConnectionCandidate | null => {
  if (preferredConnectionId === null) return null;
  return pool.find((candidate) => candidate.connection.id === preferredConnectionId) ?? null;
};

const upgradeBootstrapCandidate = async (
  candidate: TraderaConnectionCandidate
): Promise<void> => {
  try {
    await api.put(`/api/v2/integrations/connections/${candidate.connection.id}`, {
      name: candidate.connection.name,
      traderaBrowserMode: 'scripted',
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
  } catch {
    // Best-effort upgrade.
  }
};

const resolveCandidateConnection = async ({
  candidates,
  preferredConnectionId,
}: {
  candidates: TraderaConnectionCandidate[];
  preferredConnectionId: string | null;
}): Promise<ResolvedTraderaQuickExportConnection | null> => {
  const scriptedCandidates = candidates.filter((candidate) =>
    hasScriptedConfig(candidate.connection)
  );
  const pool = scriptedCandidates.length > 0 ? scriptedCandidates : candidates;
  const preferred = findPreferredCandidate({ pool, preferredConnectionId });
  if (preferred !== null) return toResolvedConnection(preferred);

  const [bootstrap] = candidates;
  if (scriptedCandidates.length === 0 && bootstrap !== undefined) {
    await upgradeBootstrapCandidate(bootstrap);
    return toResolvedConnection(bootstrap);
  }

  const [first] = pool;
  return first === undefined ? null : toResolvedConnection(first);
};

export const useResolveTraderaQuickExportConnection = (
  queryClient: QueryClient
): (() => Promise<ResolvedTraderaQuickExportConnection | null>) =>
  useCallback(async (): Promise<ResolvedTraderaQuickExportConnection | null> => {
    const preferredConnectionId = await fetchPreferredConnectionId(queryClient);
    const candidates = await fetchTraderaConnectionCandidates(queryClient);
    return resolveCandidateConnection({ candidates, preferredConnectionId });
  }, [queryClient]);
