'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';

import {
  fetchIntegrationsWithConnections,
  fetchPreferredTraderaConnection,
  integrationSelectionQueryKeys,
  isTraderaBrowserIntegrationSlug,
  useCreateListingMutation,
} from '@/features/integrations/public';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import { createTraderaRecoveryContext } from '@/features/integrations/utils/product-listings-recovery';
import { ensureTraderaBrowserSession, isTraderaBrowserAuthRequiredMessage } from '@/features/integrations/utils/tradera-browser-session';
import type {
  IntegrationWithConnections,
  ProductListingsRecoveryContext,
} from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { ApiError, api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { Button, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  clearPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
} from './traderaQuickListFeedback';

import {
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
} from '../product-column-utils';

type TraderaQuickListFeedbackStatus = 'processing' | 'queued' | 'failed' | 'auth_required';

type BasicTraderaConnection = IntegrationWithConnections['connections'][number];

type ResolvedTraderaBrowserConnection = {
  integrationId: string;
  connection: BasicTraderaConnection;
};

type ResolvedTraderaQuickListContext = {
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
  integrations: IntegrationWithConnections[],
): ResolvedTraderaBrowserConnection[] =>
  (Array.isArray(integrations) ? integrations : [])
    .filter((integration) => isTraderaBrowserIntegrationSlug(integration.slug))
    .flatMap((integration) =>
      (Array.isArray(integration.connections) ? integration.connections : []).map((connection) => ({
        integrationId: integration.id,
        connection,
      }))
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

  candidates.sort((left, right) => (left.connection.name ?? '').localeCompare(right.connection.name ?? ''));

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
    bootstrapConnection: pickPreferredTraderaBrowserConnection(candidates, preferredConnectionId),
  };
};

export function TraderaQuickListButton(props: {
  product: ProductWithImages;
  prefetchListings: () => void;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  showTraderaBadge?: boolean;
  traderaStatus?: string;
}): React.JSX.Element | null {
  const {
    product,
    prefetchListings,
    onOpenIntegrations,
    showTraderaBadge = false,
    traderaStatus = 'not_started',
  } = props;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createListingMutation = useCreateListingMutation(product.id);
  const [submitting, setSubmitting] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<PersistedTraderaQuickListFeedback | null>(
    () => readPersistedTraderaQuickListFeedback(product.id)
  );
  const localFeedbackStatus = localFeedback?.status ?? null;
  const normalizedTraderaStatus = normalizeMarketplaceStatus(traderaStatus);
  const hasServerStatus =
    normalizedTraderaStatus.length > 0 && normalizedTraderaStatus !== 'not_started';
  const serverStatusInFlight =
    PENDING_STATUSES.has(normalizedTraderaStatus) ||
    PROCESSING_STATUSES.has(normalizedTraderaStatus);

  useEffect(() => {
    setLocalFeedback(readPersistedTraderaQuickListFeedback(product.id));
  }, [product.id]);

  useEffect(() => {
    const keepFailureRecoveryContext =
      showTraderaBadge && FAILURE_STATUSES.has(normalizedTraderaStatus);
    if (keepFailureRecoveryContext) {
      setLocalFeedback(readPersistedTraderaQuickListFeedback(product.id));
      return;
    }
    if (!showTraderaBadge && normalizedTraderaStatus === 'not_started') return;
    clearPersistedTraderaQuickListFeedback(product.id);
    setLocalFeedback(null);
  }, [normalizedTraderaStatus, product.id, showTraderaBadge]);

  const setFeedbackStatus = useCallback(
    (
      status: TraderaQuickListFeedbackStatus | null,
      options?: {
        runId?: string | null | undefined;
        requestId?: string | null | undefined;
        integrationId?: string | null | undefined;
        connectionId?: string | null | undefined;
      }
    ): void => {
      if (!status) {
        clearPersistedTraderaQuickListFeedback(product.id);
        setLocalFeedback(null);
        return;
      }
      persistTraderaQuickListFeedback(product.id, status, options);
      setLocalFeedback(readPersistedTraderaQuickListFeedback(product.id));
    },
    [product.id]
  );

  useEffect(() => {
    if (!localFeedback) return;
    if (localFeedback.status !== 'processing' && localFeedback.status !== 'queued') {
      return;
    }

    const remainingMs = localFeedback.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setFeedbackStatus('failed', {
        runId: localFeedback.runId ?? null,
        requestId: localFeedback.requestId ?? null,
        integrationId: localFeedback.integrationId ?? null,
        connectionId: localFeedback.connectionId ?? null,
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackStatus('failed', {
        runId: localFeedback.runId ?? null,
        requestId: localFeedback.requestId ?? null,
        integrationId: localFeedback.integrationId ?? null,
        connectionId: localFeedback.connectionId ?? null,
      });
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localFeedback, setFeedbackStatus]);

  const resolveConnection = useCallback(async (): Promise<ResolvedTraderaQuickListContext> => {
    let preferredConnectionId: string | null = null;
    try {
      const preferredConnection = await fetchQueryV2(queryClient, {
        queryKey: normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
        queryFn: fetchPreferredTraderaConnection,
        staleTime: 5 * 60 * 1000,
        meta: {
          source: 'products.components.TraderaQuickListButton.resolvePreferredConnection',
          operation: 'detail',
          resource: 'integrations.tradera-default-connection',
          domain: 'integrations',
          tags: ['integrations', 'tradera', 'quick-list'],
          description: 'Loads preferred Tradera connection for quick export.',
        },
      })();
      preferredConnectionId =
        typeof preferredConnection?.connectionId === 'string' ? preferredConnection.connectionId : null;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'TraderaQuickListButton',
        action: 'resolvePreferredConnection',
        productId: product.id,
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
  }, [product.id, queryClient]);

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
      }>(`/api/v2/integrations/connections/${bootstrapConnection.connection.id}`, {
        name: bootstrapConnection.connection.name,
        traderaBrowserMode: 'scripted',
        playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      });

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
                  traderaBrowserMode: upgraded.traderaBrowserMode ?? 'scripted',
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
          hasPlaywrightListingScript: upgraded.hasPlaywrightListingScript ?? true,
          playwrightListingScript: upgraded.playwrightListingScript ?? DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        } as BasicTraderaConnection,
      };
    },
    [queryClient]
  );

  const handleClick = useCallback(async (): Promise<void> => {
    if (submitting || localFeedbackStatus === 'queued') return;

    setSubmitting(true);
    setFeedbackStatus('processing');
    let attemptedRecoveryTarget:
      | {
        integrationId: string;
        connectionId: string;
      }
      | undefined;

    try {
      const resolvedContext = await resolveConnection();
      const resolvedConnection =
        resolvedContext.scriptedConnection ??
        (await enableDefaultScriptedConnection(resolvedContext));
      if (!resolvedConnection) {
        setFeedbackStatus('failed');
        toast(
          'No Tradera browser connection configured for Quicklist. Add a Tradera browser connection first.',
          { variant: 'error' }
        );
        onOpenIntegrations?.();
        return;
      }

      const recoveryTarget = {
        integrationId: resolvedConnection.integrationId,
        connectionId: resolvedConnection.connection.id,
      } as const;
      attemptedRecoveryTarget = recoveryTarget;
      setFeedbackStatus('processing', recoveryTarget);

      const sessionResponse = await ensureTraderaBrowserSession({
        integrationId: resolvedConnection.integrationId,
        connectionId: resolvedConnection.connection.id,
      });
      if (!sessionResponse.savedSession) {
        setFeedbackStatus('failed', recoveryTarget);
        toast(
          'Tradera login session could not be saved. Complete login verification and retry.',
          { variant: 'error' }
        );
        onOpenIntegrations?.(
          createTraderaRecoveryContext({
            status: 'auth_required',
            runId: localFeedback?.runId ?? null,
            requestId: null,
            integrationId: recoveryTarget.integrationId,
            connectionId: recoveryTarget.connectionId,
          })
        );
        return;
      }

      const response = await createListingMutation.mutateAsync({
        integrationId: resolvedConnection.integrationId,
        connectionId: resolvedConnection.connection.id,
      });

      setFeedbackStatus('queued', recoveryTarget);
      const queueJobId =
        typeof response.queue?.jobId === 'string' && response.queue.jobId.trim().length > 0
          ? response.queue.jobId.trim()
          : null;
      if (queueJobId) {
        setFeedbackStatus('queued', {
          ...recoveryTarget,
          requestId: queueJobId,
        });
      }
      try {
        await api.post('/api/v2/integrations/exports/tradera/default-connection', {
          connectionId: resolvedConnection.connection.id,
        });
        queryClient.setQueryData(
          normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
          { connectionId: resolvedConnection.connection.id }
        );
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'TraderaQuickListButton',
          action: 'persistPreferredConnection',
          productId: product.id,
          connectionId: resolvedConnection.connection.id,
          level: 'warn',
        });
      }
      if (sessionResponse.savedSession) {
        toast('Tradera login session refreshed.', { variant: 'success' });
      }
      toast(
        response.queue?.jobId
          ? `Tradera listing queued (job ${response.queue.jobId}).`
          : 'Tradera listing queued.',
        { variant: 'success' }
      );
      prefetchListings();
      await invalidateProductListingsAndBadges(queryClient, product.id);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedbackStatus(null);
        toast(error.message || 'This product already has a Tradera listing on this account.', {
          variant: 'error',
        });
        onOpenIntegrations?.();
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to queue Tradera listing.';
      const authRequired = isTraderaBrowserAuthRequiredMessage(errorMessage);
      setFeedbackStatus(authRequired ? 'auth_required' : 'failed', attemptedRecoveryTarget);
      logClientCatch(error, {
        source: 'TraderaQuickListButton',
        action: 'quickList',
        productId: product.id,
      });
      toast(errorMessage, {
        variant: 'error',
      });
      if (authRequired && onOpenIntegrations && attemptedRecoveryTarget) {
        onOpenIntegrations(
          createTraderaRecoveryContext({
            status: 'auth_required',
            runId: localFeedback?.runId ?? null,
            requestId: localFeedback?.requestId ?? null,
            integrationId: attemptedRecoveryTarget.integrationId,
            connectionId: attemptedRecoveryTarget.connectionId,
          })
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    createListingMutation,
    localFeedbackStatus,
    onOpenIntegrations,
    prefetchListings,
    product.id,
    queryClient,
    enableDefaultScriptedConnection,
    resolveConnection,
    setFeedbackStatus,
    submitting,
    toast,
  ]);

  if (showTraderaBadge) {
    return null;
  }

  const resolvedButtonStatus = submitting
    ? 'processing'
    : hasServerStatus
      ? normalizedTraderaStatus
      : (localFeedbackStatus ?? 'not_started');
  const shouldUseFilledMarketplaceTone = hasServerStatus || localFeedbackStatus !== null;
  const isFailureState = FAILURE_STATUSES.has(normalizeMarketplaceStatus(resolvedButtonStatus));
  const recoveryContext: ProductListingsRecoveryContext | undefined = isFailureState
    ? createTraderaRecoveryContext({
      status: resolvedButtonStatus,
      runId: localFeedback?.runId ?? null,
      requestId: localFeedback?.requestId ?? null,
      integrationId: localFeedback?.integrationId ?? null,
      connectionId: localFeedback?.connectionId ?? null,
    })
    : undefined;
  const resolvedLabel = isFailureState
    ? `Open Tradera recovery options (${resolvedButtonStatus}).`
    : 'One-click export to Tradera';

  return (
    <Button
      type='button'
      onClick={() => {
        if (isFailureState && onOpenIntegrations) {
          onOpenIntegrations(recoveryContext);
          return;
        }
        void handleClick();
      }}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      variant='ghost'
      size='icon'
      disabled={submitting || localFeedbackStatus === 'queued' || serverStatusInFlight}
      aria-label={resolvedLabel}
      title={`${resolvedLabel} (${resolvedButtonStatus}${traderaStatus ? ` / ${traderaStatus}` : ''})`}
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        (submitting || localFeedbackStatus === 'queued' || serverStatusInFlight) &&
          'cursor-not-allowed opacity-60',
        getMarketplaceButtonClass(
          resolvedButtonStatus,
          shouldUseFilledMarketplaceTone,
          'tradera'
        )
      )}
    >
      <span
        aria-hidden='true'
        className='text-[10px] font-black uppercase leading-none tracking-tight'
      >
        T+
      </span>
    </Button>
  );
}
