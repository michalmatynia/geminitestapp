'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  DEFAULT_TRADERA_QUICKLIST_SCRIPT,
  fetchIntegrationsWithConnections,
  fetchPreferredTraderaConnection,
  integrationSelectionQueryKeys,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/public';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicTraderaConnection = IntegrationWithConnections['connections'][number];

export type ResolvedTraderaBrowserConnection = {
  integrationId: string;
  connection: BasicTraderaConnection;
};

export type ResolvedTraderaQuickListContext = {
  preferredConnectionId: string | null;
  integrations: IntegrationWithConnections[];
  scriptedConnection: ResolvedTraderaBrowserConnection | null;
  bootstrapConnection: ResolvedTraderaBrowserConnection | null;
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

const hasScriptedTraderaQuickListConfig = (connection: BasicTraderaConnection): boolean => {
  const data = connection as Record<string, unknown>;
  return (
    data['traderaBrowserMode'] === 'scripted' &&
    hasPlaywrightListingScriptConfigured(connection)
  );
};

const listTraderaBrowserConnections = (
  integrations: IntegrationWithConnections[]
): ResolvedTraderaBrowserConnection[] =>
  (Array.isArray(integrations) ? integrations : [])
    .filter((integration) => isTraderaBrowserIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      (Array.isArray(integration.connections) ? integration.connections : []).map(
        (connection) => ({
          integrationId: integration.id,
          connection,
        })
      )
    );

const pickPreferredTraderaBrowserConnection = (
  candidates: ResolvedTraderaBrowserConnection[],
  preferredConnectionId: string | null
): ResolvedTraderaBrowserConnection | null => {
  if (candidates.length === 0) return null;

  if (preferredConnectionId) {
    const preferred = candidates.find(
      (candidate) => candidate.connection.id === preferredConnectionId
    );
    if (preferred) return preferred;
  }

  candidates.sort((left, right) =>
    (left.connection.name ?? '').localeCompare(right.connection.name ?? '')
  );

  return candidates[0] ?? null;
};

const resolveTraderaBrowserConnection = (
  integrations: IntegrationWithConnections[],
  preferredConnectionId: string | null
): ResolvedTraderaQuickListContext => {
  const candidates = listTraderaBrowserConnections(integrations);
  const scriptedCandidates = candidates.filter((candidate) =>
    hasScriptedTraderaQuickListConfig(candidate.connection)
  );

  return {
    preferredConnectionId,
    integrations,
    scriptedConnection: pickPreferredTraderaBrowserConnection(
      scriptedCandidates,
      preferredConnectionId
    ),
    bootstrapConnection: pickPreferredTraderaBrowserConnection(
      candidates,
      preferredConnectionId
    ),
  };
};

export function useTraderaQuickExportConnection(productId: string): {
  resolveConnection: () => Promise<ResolvedTraderaQuickListContext>;
  enableDefaultScriptedConnection: (
    context: ResolvedTraderaQuickListContext
  ) => Promise<ResolvedTraderaBrowserConnection | null>;
} {
  const queryClient = useQueryClient();

  const resolveConnection =
    useCallback(async (): Promise<ResolvedTraderaQuickListContext> => {
      let preferredConnectionId: string | null = null;
      try {
        const preferredConnection = await fetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(
            integrationSelectionQueryKeys.traderaDefaultConnection
          ),
          queryFn: fetchPreferredTraderaConnection,
          staleTime: 5 * 60 * 1000,
          meta: {
            source:
              'products.components.TraderaQuickListButton.resolvePreferredConnection',
            operation: 'detail',
            resource: 'integrations.tradera-default-connection',
            domain: 'integrations',
            tags: ['integrations', 'tradera', 'quick-list'],
            description: 'Loads preferred Tradera connection for quick export.',
          },
        })();
        preferredConnectionId =
          typeof preferredConnection?.connectionId === 'string'
            ? preferredConnection.connectionId
            : null;
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'TraderaQuickListButton',
          action: 'resolvePreferredConnection',
          productId,
          level: 'warn',
        });
      }

      const integrations = await fetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
        queryFn: fetchIntegrationsWithConnections,
        staleTime: 5 * 60 * 1000,
        meta: {
          source: 'products.components.TraderaQuickListButton.resolveConnection',
          operation: 'list',
          resource: 'integrations.with-connections',
          domain: 'integrations',
          tags: ['integrations', 'tradera', 'quick-list'],
          description: 'Loads integrations connections for Tradera quick export.',
        },
      })();

      return resolveTraderaBrowserConnection(integrations, preferredConnectionId);
    }, [productId, queryClient]);

  const enableDefaultScriptedConnection = useCallback(
    async (
      context: ResolvedTraderaQuickListContext
    ): Promise<ResolvedTraderaBrowserConnection | null> => {
      const bootstrapConnection = context.bootstrapConnection;
      if (!bootstrapConnection) {
        return null;
      }

      const upgraded = await api.put<{
        id: string;
        integrationId: string;
        name: string;
        traderaBrowserMode?: 'builtin' | 'scripted' | null;
        playwrightListingScript?: string | null;
        hasPlaywrightListingScript?: boolean;
      }>(
        `/api/v2/integrations/connections/${bootstrapConnection.connection.id}`,
        {
          name: bootstrapConnection.connection.name,
          traderaBrowserMode: 'scripted',
          playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        }
      );

      const nextIntegrations = (context.integrations ?? []).map((integration) =>
        integration.id !== bootstrapConnection.integrationId
          ? integration
          : {
              ...integration,
              connections: (integration.connections ?? []).map((connection) =>
                connection.id !== bootstrapConnection.connection.id
                  ? connection
                  : {
                      ...connection,
                      traderaBrowserMode:
                        upgraded.traderaBrowserMode ?? 'scripted',
                      hasPlaywrightListingScript:
                        upgraded.hasPlaywrightListingScript ?? true,
                    }
              ),
            }
      );

      queryClient.setQueryData(
        normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
        nextIntegrations
      );

      return {
        integrationId: bootstrapConnection.integrationId,
        connection: {
          ...bootstrapConnection.connection,
          traderaBrowserMode: upgraded.traderaBrowserMode ?? 'scripted',
          hasPlaywrightListingScript:
            upgraded.hasPlaywrightListingScript ?? true,
          playwrightListingScript:
            upgraded.playwrightListingScript ??
            DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        } as BasicTraderaConnection,
      };
    },
    [queryClient]
  );

  return { resolveConnection, enableDefaultScriptedConnection };
}
