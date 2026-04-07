'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredVintedConnection,
  integrationSelectionQueryKeys,
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { isVintedIntegrationSlug } from '@/features/integrations/constants/slugs';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicVintedConnection = IntegrationWithConnections['connections'][number];

export type ResolvedVintedBrowserConnection = {
  integrationId: string;
  connection: BasicVintedConnection;
};

export type ResolvedVintedQuickListContext = {
  preferredConnectionId: string | null;
  integrations: IntegrationWithConnections[];
  vintedConnection: ResolvedVintedBrowserConnection | null;
};

const listVintedBrowserConnections = (
  integrations: IntegrationWithConnections[]
): ResolvedVintedBrowserConnection[] =>
  (Array.isArray(integrations) ? integrations : [])
    .filter((integration) => isVintedIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      (Array.isArray(integration.connections) ? integration.connections : []).map(
        (connection) => ({
          integrationId: integration.id,
          connection,
        })
      )
    );

const pickPreferredVintedBrowserConnection = (
  candidates: ResolvedVintedBrowserConnection[],
  preferredConnectionId: string | null
): ResolvedVintedBrowserConnection | null => {
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

const resolveVintedBrowserConnection = (
  integrations: IntegrationWithConnections[],
  preferredConnectionId: string | null
): ResolvedVintedQuickListContext => {
  const candidates = listVintedBrowserConnections(integrations);

  return {
    preferredConnectionId,
    integrations,
    vintedConnection: pickPreferredVintedBrowserConnection(
      candidates,
      preferredConnectionId
    ),
  };
};

export function useVintedQuickExportConnection(productId: string): {
  resolveConnection: () => Promise<ResolvedVintedQuickListContext>;
} {
  const queryClient = useQueryClient();

  const resolveConnection =
    useCallback(async (): Promise<ResolvedVintedQuickListContext> => {
      let preferredConnectionId: string | null = null;
      try {
        const preferredConnection = await fetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(
            integrationSelectionQueryKeys.vintedDefaultConnection
          ),
          queryFn: fetchPreferredVintedConnection,
          staleTime: 5 * 60 * 1000,
          meta: {
            source:
              'products.components.VintedQuickListButton.resolvePreferredConnection',
            operation: 'detail',
            resource: 'integrations.vinted-default-connection',
            domain: 'integrations',
            tags: ['integrations', 'vinted', 'quick-list'],
            description: 'Loads preferred Vinted connection for quick export.',
          },
        })();
        preferredConnectionId =
          typeof preferredConnection?.connectionId === 'string'
            ? preferredConnection.connectionId
            : null;
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'VintedQuickListButton',
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
          source: 'products.components.VintedQuickListButton.resolveConnection',
          operation: 'list',
          resource: 'integrations.with-connections',
          domain: 'integrations',
          tags: ['integrations', 'vinted', 'quick-list'],
          description: 'Loads integrations connections for Vinted quick export.',
        },
      })();

      return resolveVintedBrowserConnection(integrations, preferredConnectionId);
    }, [productId, queryClient]);

  return { resolveConnection };
}
