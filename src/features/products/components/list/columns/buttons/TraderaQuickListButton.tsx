'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { integrationSelectionQueryKeys } from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { useCreateListingMutation } from '@/features/integrations/hooks/useProductListingMutations';
import { createTraderaRecoveryContext } from '@/features/integrations/utils/product-listings-recovery';
import {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
} from '@/features/integrations/utils/tradera-browser-session';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/toast';

import { cn } from '@/shared/utils/ui-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
} from '../product-column-utils';

import { useTraderaQuickExportConnection } from './hooks/useTraderaQuickExportConnection';
import { useTraderaQuickExportFeedback } from './hooks/useTraderaQuickExportFeedback';
import { useTraderaQuickExportPolling } from './hooks/useTraderaQuickExportPolling';

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
  const [showCheckmark, setShowCheckmark] = useState(false);

  const { resolveConnection, enableDefaultScriptedConnection } =
    useTraderaQuickExportConnection(product.id);
  const {
    localFeedback,
    localFeedbackStatus,
    setFeedbackStatus,
    hasServerStatus,
    serverStatusInFlight,
    normalizedTraderaStatus,
  } = useTraderaQuickExportFeedback(product.id, traderaStatus, showTraderaBadge);
  useTraderaQuickExportPolling(product.id, localFeedback, setFeedbackStatus);

  const localFeedbackRef = useRef(localFeedback);
  localFeedbackRef.current = localFeedback;

  // Flash checkmark for 3s when status transitions to completed
  useEffect(() => {
    if (localFeedbackStatus === 'completed') {
      setShowCheckmark(true);
      const timerId = window.setTimeout(() => setShowCheckmark(false), 3000);
      return () => {
        window.clearTimeout(timerId);
      };
    }
    setShowCheckmark(false);
    return undefined;
  }, [localFeedbackStatus]);

  const handleClick = useCallback(async (): Promise<void> => {
    if (submitting || localFeedbackStatus === 'queued') return;

    setSubmitting(true);
    setFeedbackStatus('processing');
    let attemptedRecoveryTarget:
      | { integrationId: string; connectionId: string }
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

      const preflightResponse = await preflightTraderaQuickListSession({
        integrationId: resolvedConnection.integrationId,
        connectionId: resolvedConnection.connection.id,
      });
      if (!preflightResponse.ready) {
        // Preflight failed — fall back to full manual session establishment
        const manualSessionResponse = await ensureTraderaBrowserSession({
          integrationId: resolvedConnection.integrationId,
          connectionId: resolvedConnection.connection.id,
        });
        if (!manualSessionResponse.savedSession) {
          setFeedbackStatus('failed', recoveryTarget);
          toast(
            'Tradera login session could not be saved. Complete login verification and retry.',
            { variant: 'error' }
          );
          onOpenIntegrations?.(
            createTraderaRecoveryContext({
              status: 'auth_required',
              runId: localFeedbackRef.current?.runId ?? null,
              requestId: null,
              integrationId: recoveryTarget.integrationId,
              connectionId: recoveryTarget.connectionId,
            })
          );
          return;
        }
        toast('Tradera login session refreshed.', { variant: 'success' });
      }

      const response = await createListingMutation.mutateAsync({
        integrationId: resolvedConnection.integrationId,
        connectionId: resolvedConnection.connection.id,
      });

      const listingId =
        typeof response.id === 'string' && response.id.trim().length > 0
          ? response.id.trim()
          : null;
      const queueJobId =
        typeof response.queue?.jobId === 'string' &&
        response.queue.jobId.trim().length > 0
          ? response.queue.jobId.trim()
          : null;
      setFeedbackStatus('queued', {
        ...recoveryTarget,
        listingId,
        requestId: queueJobId,
      });
      try {
        await api.post(
          '/api/v2/integrations/exports/tradera/default-connection',
          { connectionId: resolvedConnection.connection.id }
        );
        queryClient.setQueryData(
          normalizeQueryKey(
            integrationSelectionQueryKeys.traderaDefaultConnection
          ),
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
      toast(
        response.queue?.jobId
          ? `Tradera listing queued (job ${response.queue.jobId}).`
          : 'Tradera listing queued.',
        { variant: 'success' }
      );
      prefetchListings();
      await invalidateProductListingsAndBadges(queryClient, product.id);
      await invalidateProducts(queryClient);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedbackStatus(null);
        toast(
          error.message ||
            'This product already has a Tradera listing on this account.',
          { variant: 'error' }
        );
        onOpenIntegrations?.();
        return;
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to queue Tradera listing.';
      const authRequired = isTraderaBrowserAuthRequiredMessage(errorMessage);
      setFeedbackStatus(
        authRequired ? 'auth_required' : 'failed',
        {
          ...attemptedRecoveryTarget,
          failureReason: authRequired ? null : errorMessage,
        }
      );
      logClientCatch(error, {
        source: 'TraderaQuickListButton',
        action: 'quickList',
        productId: product.id,
      });
      toast(errorMessage, { variant: 'error' });
      if (authRequired && onOpenIntegrations && attemptedRecoveryTarget) {
        onOpenIntegrations(
          createTraderaRecoveryContext({
            status: 'auth_required',
            runId: localFeedbackRef.current?.runId ?? null,
            requestId: localFeedbackRef.current?.requestId ?? null,
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
    enableDefaultScriptedConnection,
    localFeedbackStatus,
    onOpenIntegrations,
    prefetchListings,
    product.id,
    queryClient,
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
  const shouldUseFilledMarketplaceTone =
    hasServerStatus || localFeedbackStatus !== null;
  const isFailureState = FAILURE_STATUSES.has(
    normalizeMarketplaceStatus(resolvedButtonStatus)
  );
  const isProcessingOrQueued =
    resolvedButtonStatus === 'processing' || resolvedButtonStatus === 'queued';
  const recoveryContext: ProductListingsRecoveryContext | undefined =
    isFailureState
      ? createTraderaRecoveryContext({
          status: resolvedButtonStatus,
          runId: localFeedback?.runId ?? null,
          failureReason: localFeedback?.failureReason ?? null,
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
      disabled={
        submitting || localFeedbackStatus === 'queued' || serverStatusInFlight
      }
      aria-label={resolvedLabel}
      title={`${resolvedLabel} (${resolvedButtonStatus}${traderaStatus ? ` / ${traderaStatus}` : ''})`}
      className={cn(
        'relative size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        (submitting ||
          localFeedbackStatus === 'queued' ||
          serverStatusInFlight) &&
          'cursor-not-allowed opacity-60',
        isProcessingOrQueued && 'animate-pulse',
        getMarketplaceButtonClass(
          resolvedButtonStatus,
          shouldUseFilledMarketplaceTone,
          'tradera'
        )
      )}
    >
      {showCheckmark ? (
        <Check className='h-3 w-3' aria-hidden='true' />
      ) : (
        <span
          aria-hidden='true'
          className='text-[10px] font-black uppercase leading-none tracking-tight'
        >
          T+
        </span>
      )}
      {isFailureState ? (
        <span
          aria-hidden='true'
          className='absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500'
        />
      ) : null}
    </Button>
  );
}
