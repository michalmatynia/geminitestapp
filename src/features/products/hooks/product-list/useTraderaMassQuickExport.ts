'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredTraderaConnection,
  integrationSelectionQueryKeys,
  isTraderaBrowserIntegrationSlug,
  DEFAULT_TRADERA_QUICKLIST_SCRIPT,
  persistTraderaQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { useToast } from '@/shared/ui/toast';
import type { ProgressSnapshotDto } from '@/shared/contracts/base';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicTraderaConnection = IntegrationWithConnections['connections'][number];

type ResolvedConnection = {
  integrationId: string;
  connectionId: string;
};

export type { ProgressSnapshotDto as MassQuickExportProgress };

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

export function useTraderaMassQuickExport(): {
  execute: (productIds: string[]) => Promise<void>;
  isRunning: boolean;
  progress: ProgressSnapshotDto;
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressSnapshotDto>({
    current: 0,
    total: 0,
    errors: 0,
  });
  const abortRef = useRef(false);

  const resolveConnection = useCallback(async (): Promise<ResolvedConnection | null> => {
    let preferredConnectionId: string | null = null;
    try {
      const preferredConnection = await fetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(
          integrationSelectionQueryKeys.traderaDefaultConnection
        ),
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
      preferredConnectionId =
        typeof preferredConnection?.connectionId === 'string'
          ? preferredConnection.connectionId
          : null;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'useTraderaMassQuickExport',
        action: 'resolvePreferredConnection',
        level: 'warn',
      });
    }

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

    const candidates = (Array.isArray(integrations) ? integrations : [])
      .filter((integration) => isTraderaBrowserIntegrationSlug(integration.slug))
      .flatMap((integration) =>
        (Array.isArray(integration.connections)
          ? integration.connections
          : []
        ).map((connection) => ({
          integrationId: integration.id,
          connection,
        }))
      );

    // Prefer scripted connections
    const scriptedCandidates = candidates.filter((c) =>
      hasScriptedConfig(c.connection)
    );
    const pool = scriptedCandidates.length > 0 ? scriptedCandidates : candidates;

    if (pool.length === 0) return null;

    // Prefer the preferred connection
    if (preferredConnectionId) {
      const preferred = pool.find(
        (c) => c.connection.id === preferredConnectionId
      );
      if (preferred) {
        return {
          integrationId: preferred.integrationId,
          connectionId: preferred.connection.id,
        };
      }
    }

    // If no scripted candidates and we have a bootstrap candidate, auto-upgrade it
    if (scriptedCandidates.length === 0 && candidates.length > 0) {
      const bootstrap = candidates[0]!;
      try {
        await api.put(
          `/api/v2/integrations/connections/${bootstrap.connection.id}`,
          {
            name: bootstrap.connection.name,
            traderaBrowserMode: 'scripted',
            playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
          }
        );
      } catch {
        // Best-effort upgrade
      }
      return {
        integrationId: bootstrap.integrationId,
        connectionId: bootstrap.connection.id,
      };
    }

    const first = pool[0]!;
    return {
      integrationId: first.integrationId,
      connectionId: first.connection.id,
    };
  }, [queryClient]);

  const execute = useCallback(
    async (productIds: string[]): Promise<void> => {
      if (isRunning || productIds.length === 0) return;

      abortRef.current = false;
      setIsRunning(true);
      setProgress({ current: 0, total: productIds.length, errors: 0 });

      let resolved: ResolvedConnection | null;
      try {
        resolved = await resolveConnection();
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useTraderaMassQuickExport',
          action: 'resolveConnection',
        });
        toast('Failed to resolve Tradera connection for mass export.', {
          variant: 'error',
        });
        setIsRunning(false);
        return;
      }

      if (!resolved) {
        toast(
          'No Tradera browser connection configured. Add a Tradera browser connection first.',
          { variant: 'error' }
        );
        setIsRunning(false);
        return;
      }

      let errorCount = 0;

      for (let i = 0; i < productIds.length; i++) {
        if (abortRef.current) break;
        const productId = productIds[i]!;

        try {
          persistTraderaQuickListFeedback(productId, 'processing', {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
          });

          const response = await api.post<{
            id?: string;
            queue?: { jobId?: string; name?: string };
          }>(`/api/v2/integrations/products/${productId}/listings`, {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
          });

          const listingId =
            typeof response.id === 'string' && response.id.trim().length > 0
              ? response.id.trim()
              : null;
          const jobId =
            typeof response.queue?.jobId === 'string' &&
            response.queue.jobId.trim().length > 0
              ? response.queue.jobId.trim()
              : null;

          persistTraderaQuickListFeedback(productId, 'queued', {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
            listingId,
            requestId: jobId,
          });

          void invalidateProductListingsAndBadges(queryClient, productId);
        } catch (error: unknown) {
          errorCount++;
          logClientCatch(error, {
            source: 'useTraderaMassQuickExport',
            action: 'exportProduct',
            productId,
          });
          persistTraderaQuickListFeedback(productId, 'failed', {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
          });
        }

        setProgress({
          current: i + 1,
          total: productIds.length,
          errors: errorCount,
        });

        if ((i + 1) % 5 === 0 || i + 1 === productIds.length) {
          toast(
            `Exporting ${i + 1}/${productIds.length} to Tradera...${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
            { variant: 'info' }
          );
        }
      }

      // Persist preferred connection
      try {
        await api.post(
          '/api/v2/integrations/exports/tradera/default-connection',
          { connectionId: resolved.connectionId }
        );
        queryClient.setQueryData(
          normalizeQueryKey(
            integrationSelectionQueryKeys.traderaDefaultConnection
          ),
          { connectionId: resolved.connectionId }
        );
      } catch {
        // Best-effort
      }

      const successCount = productIds.length - errorCount;
      toast(
        errorCount > 0
          ? `Tradera mass export done: ${successCount}/${productIds.length} queued, ${errorCount} failed.`
          : `Tradera mass export done: ${successCount} products queued.`,
        { variant: errorCount > 0 ? 'error' : 'success' }
      );

      setIsRunning(false);
    },
    [isRunning, queryClient, resolveConnection, toast]
  );

  return { execute, isRunning, progress };
}
