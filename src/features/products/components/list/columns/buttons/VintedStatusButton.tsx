'use client';

import React from 'react';

import {
  createVintedRecoveryContext,
  readPersistedVintedQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
  resolveMarketplaceStatusWithLocalFeedback,
} from '../product-column-utils';
import { ProductListMarketplaceTextButton } from './ProductListMarketplaceButton';

const buildVintedRecoveryContext = ({
  effectiveStatus,
  persistedFeedback,
}: {
  effectiveStatus: string;
  persistedFeedback: ReturnType<typeof readPersistedVintedQuickListFeedback>;
}): ProductListingsRecoveryContext | undefined => {
  if (!FAILURE_STATUSES.has(effectiveStatus)) return undefined;
  if (persistedFeedback === null) {
    return createVintedRecoveryContext({
      status: effectiveStatus,
      runId: null,
      failureReason: null,
      requestId: null,
      integrationId: null,
      connectionId: null,
    });
  }

  return createVintedRecoveryContext({
    status: effectiveStatus,
    runId: persistedFeedback.runId ?? null,
    failureReason: persistedFeedback.failureReason ?? null,
    requestId: persistedFeedback.requestId ?? null,
    integrationId: persistedFeedback.integrationId ?? null,
    connectionId: persistedFeedback.connectionId ?? null,
  });
};

const resolveVintedStatusLabel = (effectiveStatus: string): string =>
  FAILURE_STATUSES.has(effectiveStatus)
    ? `Open Vinted recovery options (${effectiveStatus}).`
    : `Manage Vinted listing (${effectiveStatus}).`;

export function VintedStatusButton(props: {
  productId: string;
  status: string;
  prefetchListings: () => void;
  onOpenListings: (recoveryContext?: ProductListingsRecoveryContext) => void;
}): React.JSX.Element {
  const { productId, status, prefetchListings, onOpenListings } = props;
  const normalizedStatus = normalizeMarketplaceStatus(status);
  const persistedFeedback = readPersistedVintedQuickListFeedback(productId);
  const effectiveStatus = resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: normalizedStatus,
    localFeedbackStatus: persistedFeedback?.status ?? null,
  });
  const recoveryContext = buildVintedRecoveryContext({ effectiveStatus, persistedFeedback });
  const label = resolveVintedStatusLabel(effectiveStatus);

  return (
    <ProductListMarketplaceTextButton
      type='button'
      onClick={() => onOpenListings(recoveryContext)}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      aria-label={label}
      title={label}
      toneClass={getMarketplaceButtonClass(effectiveStatus, true, 'vinted')}
      label='V'
    />
  );
}
