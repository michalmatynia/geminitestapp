'use client';

import React from 'react';

import {
  createTraderaRecoveryContext,
  readPersistedTraderaQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import { Button } from '@/shared/ui/button';

import { cn } from '@/shared/utils/ui-utils';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
  resolveMarketplaceStatusWithLocalFeedback,
} from '../product-column-utils';

export function TraderaStatusButton(props: {
  productId: string;
  status: string;
  prefetchListings: () => void;
  onOpenListings: (recoveryContext?: ProductListingsRecoveryContext) => void;
}): React.JSX.Element {
  const { productId, status, prefetchListings, onOpenListings } = props;
  const normalizedStatus = normalizeMarketplaceStatus(status);
  const isFailureState = FAILURE_STATUSES.has(normalizedStatus);
  const persistedFeedback = readPersistedTraderaQuickListFeedback(productId);
  const effectiveStatus = resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: normalizedStatus,
    localFeedbackStatus: persistedFeedback?.status ?? null,
  });
  const isEffectiveFailureState = FAILURE_STATUSES.has(effectiveStatus);
  const recoveryContext: ProductListingsRecoveryContext | undefined = isEffectiveFailureState
    ? createTraderaRecoveryContext({
        status: effectiveStatus,
        runId: persistedFeedback?.runId ?? null,
        requestId: persistedFeedback?.requestId ?? null,
        integrationId: persistedFeedback?.integrationId ?? null,
        connectionId: persistedFeedback?.connectionId ?? null,
      })
    : undefined;
  const label = isEffectiveFailureState
    ? `Open Tradera recovery options (${effectiveStatus}).`
    : `Manage Tradera listing (${effectiveStatus}).`;

  return (
    <Button
      type='button'
      onClick={() => onOpenListings(recoveryContext)}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      variant='ghost'
      size='icon'
      aria-label={label}
      title={label}
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        getMarketplaceButtonClass(effectiveStatus, true, 'tradera')
      )}
    >
      <span
        aria-hidden='true'
        className='text-[10px] font-black uppercase leading-none tracking-tight'
      >
        T
      </span>
    </Button>
  );
}
