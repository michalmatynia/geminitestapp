'use client';

import React from 'react';

import {
  createTraderaRecoveryContext,
  readPersistedTraderaQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import { useCustomFields } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import { hasProductMarketplaceExclusionSelection } from '@/shared/lib/products/utils/marketplace-exclusions';
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
  customFieldValues?: unknown;
}): React.JSX.Element {
  const { productId, status, prefetchListings, onOpenListings, customFieldValues } = props;
  const customFieldsQuery = useCustomFields();
  const normalizedStatus = normalizeMarketplaceStatus(status);
  const persistedFeedback = readPersistedTraderaQuickListFeedback(productId);
  const effectiveStatus = resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: normalizedStatus,
    localFeedbackStatus: persistedFeedback?.status ?? null,
  });
  const isEndedStatus = effectiveStatus === 'ended';
  const isTraderaMarketplaceExcluded = hasProductMarketplaceExclusionSelection({
    customFieldDefinitions: customFieldsQuery.data,
    customFieldValues,
    marketplaceLabelOrAlias: 'Tradera',
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
  const disableStatusAction = isTraderaMarketplaceExcluded || isEndedStatus;
  const label = disableStatusAction
    ? `Tradera listing disabled (${effectiveStatus}).`
    : isEffectiveFailureState
      ? `Open Tradera recovery options (${effectiveStatus}).`
      : `Manage Tradera listing (${effectiveStatus}).`;
  const resolvedToneClass = disableStatusAction
    ? 'border-slate-700/35 bg-slate-950/40 text-slate-500 hover:border-slate-700/35 hover:bg-slate-950/40 hover:text-slate-500'
    : getMarketplaceButtonClass(effectiveStatus, true, 'tradera');

  return (
    <Button
      type='button'
      onClick={() => {
        if (disableStatusAction) {
          return;
        }
        onOpenListings(recoveryContext);
      }}
      onMouseEnter={disableStatusAction ? undefined : prefetchListings}
      onFocus={disableStatusAction ? undefined : prefetchListings}
      variant='ghost'
      size='icon'
      disabled={disableStatusAction}
      aria-label={label}
      title={
        isTraderaMarketplaceExcluded
          ? 'Tradera listing is disabled because Market Exclusion -> Tradera is checked.'
          : isEndedStatus
            ? 'Tradera listing is disabled because the latest listing status is ended.'
            : label
      }
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        resolvedToneClass,
        disableStatusAction &&
          'cursor-not-allowed disabled:border-slate-700/35 disabled:bg-slate-950/40 disabled:text-slate-500 disabled:opacity-40'
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
