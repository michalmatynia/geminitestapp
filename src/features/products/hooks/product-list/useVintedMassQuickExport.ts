'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import {
  clearPersistedVintedQuickListFeedback,
  ensureVintedBrowserSession,
  fetchIntegrationsWithConnections,
  fetchPreferredVintedConnection,
  integrationSelectionQueryKeys,
  isVintedBrowserAuthRequiredMessage,
  isVintedIntegrationSlug,
  persistVintedQuickListFeedback,
  preflightVintedQuickListSession,
} from '@/features/integrations/product-integrations-adapter';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ProgressSnapshotDto } from '@/shared/contracts/base';
import { ApiError, api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type BasicVintedConnection = IntegrationWithConnections['connections'][number];

type ResolvedConnection = {
  integrationId: string;
  connectionId: string;
};

export type { ProgressSnapshotDto as MassQuickExportProgress };

const pickPreferredConnection = (
  candidates: Array<{ integrationId: string; connection: BasicVintedConnection }>,
  preferredConnectionId: string | null
): ResolvedConnection | null => {
  if (candidates.length === 0) return null;

  if (preferredConnectionId) {
    const preferred = candidates.find(
      (candidate) => candidate.connection.id === preferredConnectionId
    );
    if (preferred) {
      return {
        integrationId: preferred.integrationId,
        connectionId: preferred.connection.id,
      };
    }
  }

  const [firstCandidate] = [...candidates].sort((left, right) =>
    (left.connection.name ?? '').localeCompare(right.connection.name ?? '')
  );
  if (!firstCandidate) return null;

  return {
    integrationId: firstCandidate.integrationId,
    connectionId: firstCandidate.connection.id,
  };
};

export function useVintedMassQuickExport(): {
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
          integrationSelectionQueryKeys.vintedDefaultConnection
        ),
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
      preferredConnectionId =
        typeof preferredConnection?.connectionId === 'string'
          ? preferredConnection.connectionId
          : null;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'useVintedMassQuickExport',
        action: 'resolvePreferredConnection',
        level: 'warn',
      });
    }

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

    const candidates = (Array.isArray(integrations) ? integrations : [])
      .filter((integration) => isVintedIntegrationSlug(integration.slug))
      .flatMap((integration) =>
        (Array.isArray(integration.connections) ? integration.connections : []).map(
          (connection) => ({
            integrationId: integration.id,
            connection,
          })
        )
      );

    return pickPreferredConnection(candidates, preferredConnectionId);
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
          source: 'useVintedMassQuickExport',
          action: 'resolveConnection',
        });
        toast('Failed to resolve Vinted connection for mass export.', {
          variant: 'error',
        });
        setIsRunning(false);
        return;
      }

      if (!resolved) {
        toast(
          'No Vinted connection configured. Add a Vinted connection first.',
          { variant: 'error' }
        );
        setIsRunning(false);
        return;
      }

      try {
        const preflightResponse = await preflightVintedQuickListSession({
          integrationId: resolved.integrationId,
          connectionId: resolved.connectionId,
        });

        if (!preflightResponse.ready) {
          const manualSessionResponse = await ensureVintedBrowserSession({
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
          });

          if (!manualSessionResponse.savedSession) {
            productIds.forEach((productId) => {
              persistVintedQuickListFeedback(productId, 'failed', {
                integrationId: resolved.integrationId,
                connectionId: resolved.connectionId,
              });
            });
            toast(
              'Vinted login session could not be saved. Complete login verification and retry.',
              { variant: 'error' }
            );
            setIsRunning(false);
            return;
          }

          toast('Vinted login session refreshed.', { variant: 'success' });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to prepare the Vinted session for mass export.';
        const authRequired = isVintedBrowserAuthRequiredMessage(errorMessage);

        productIds.forEach((productId) => {
          persistVintedQuickListFeedback(productId, authRequired ? 'auth_required' : 'failed', {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
            failureReason: authRequired ? null : errorMessage,
          });
        });
        logClientCatch(error, {
          source: 'useVintedMassQuickExport',
          action: 'prepareSession',
        });
        toast(errorMessage, { variant: 'error' });
        setIsRunning(false);
        return;
      }

      let errorCount = 0;
      let alreadyListedCount = 0;

      for (let i = 0; i < productIds.length; i++) {
        if (abortRef.current) break;
        const productId = productIds[i]!;

        try {
          persistVintedQuickListFeedback(productId, 'processing', {
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

          persistVintedQuickListFeedback(productId, 'queued', {
            integrationId: resolved.integrationId,
            connectionId: resolved.connectionId,
            listingId,
            requestId: jobId,
          });

          void invalidateProductListingsAndBadges(queryClient, productId);
        } catch (error: unknown) {
          if (
            error instanceof ApiError &&
            error.status === 409 &&
            !isVintedBrowserAuthRequiredMessage(error.message)
          ) {
            alreadyListedCount++;
            clearPersistedVintedQuickListFeedback(productId);
            void invalidateProductListingsAndBadges(queryClient, productId);
          } else {
            errorCount++;
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to queue Vinted listing.';
            const authRequired = isVintedBrowserAuthRequiredMessage(errorMessage);
            persistVintedQuickListFeedback(productId, authRequired ? 'auth_required' : 'failed', {
              integrationId: resolved.integrationId,
              connectionId: resolved.connectionId,
              failureReason: authRequired ? null : errorMessage,
            });
            logClientCatch(error, {
              source: 'useVintedMassQuickExport',
              action: 'exportProduct',
              productId,
            });
          }
        }

        setProgress({
          current: i + 1,
          total: productIds.length,
          errors: errorCount,
        });

        if ((i + 1) % 5 === 0 || i + 1 === productIds.length) {
          const progressDetails = [
            errorCount > 0 ? `${errorCount} failed` : null,
            alreadyListedCount > 0 ? `${alreadyListedCount} already listed` : null,
          ]
            .filter(Boolean)
            .join(', ');

          toast(
            `Exporting ${i + 1}/${productIds.length} to Vinted...${
              progressDetails ? ` (${progressDetails})` : ''
            }`,
            { variant: 'info' }
          );
        }
      }

      try {
        await api.post(
          '/api/v2/integrations/exports/vinted/default-connection',
          { connectionId: resolved.connectionId }
        );
        queryClient.setQueryData(
          normalizeQueryKey(
            integrationSelectionQueryKeys.vintedDefaultConnection
          ),
          { connectionId: resolved.connectionId }
        );
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useVintedMassQuickExport',
          action: 'persistPreferredConnection',
          connectionId: resolved.connectionId,
          level: 'warn',
        });
      }

      await invalidateProducts(queryClient);

      const successCount = productIds.length - errorCount - alreadyListedCount;
      const summaryParts = [`${successCount}/${productIds.length} queued`];
      if (alreadyListedCount > 0) {
        summaryParts.push(`${alreadyListedCount} already listed`);
      }
      if (errorCount > 0) {
        summaryParts.push(`${errorCount} failed`);
      }

      toast(`Vinted mass export done: ${summaryParts.join(', ')}.`, {
        variant: errorCount > 0 ? 'error' : alreadyListedCount > 0 ? 'info' : 'success',
      });

      setIsRunning(false);
    },
    [isRunning, queryClient, resolveConnection, toast]
  );

  return { execute, isRunning, progress };
}
