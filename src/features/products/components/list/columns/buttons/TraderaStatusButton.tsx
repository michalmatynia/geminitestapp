'use client';

import React from 'react';

import {
  createTraderaRecoveryContext,
  readPersistedTraderaQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import { useCustomFields } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import { hasProductMarketplaceExclusionSelection } from '@/shared/lib/products/utils/marketplace-exclusions';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
  PROCESSING_STATUSES,
  resolveMarketplaceStatusWithLocalFeedback,
} from '../product-column-utils';
import {
  PRODUCT_LIST_MARKETPLACE_EXCLUDED_INTERACTION_CLASS,
  PRODUCT_LIST_MARKETPLACE_EXCLUDED_TONE_CLASS,
  ProductListMarketplaceTextButton,
} from './ProductListMarketplaceButton';

type TraderaStatusButtonProps = {
  productId: string;
  status: string;
  prefetchListings: () => void;
  onOpenListings: (recoveryContext?: ProductListingsRecoveryContext) => void;
  customFieldValues?: unknown;
};

type PersistedTraderaQuickListFeedback = {
  status?: string | null;
  runId?: string | null;
  requestId?: string | null;
  integrationId?: string | null;
  connectionId?: string | null;
};

type TraderaRecoveryIdentifiers = {
  runId: string | null;
  requestId: string | null;
  integrationId: string | null;
  connectionId: string | null;
};

const EMPTY_TRADERA_RECOVERY_IDENTIFIERS: TraderaRecoveryIdentifiers = {
  runId: null,
  requestId: null,
  integrationId: null,
  connectionId: null,
};

const resolveTraderaStatusLabel = ({
  disableStatusAction,
  isEffectiveFailureState,
  effectiveStatus,
}: {
  disableStatusAction: boolean;
  isEffectiveFailureState: boolean;
  effectiveStatus: string;
}): string => {
  if (disableStatusAction) return `Tradera listing disabled (${effectiveStatus}).`;
  if (isEffectiveFailureState) return `Open Tradera recovery options (${effectiveStatus}).`;
  return `Manage Tradera listing (${effectiveStatus}).`;
};

const resolveTraderaStatusTitle = ({
  isTraderaMarketplaceExcluded,
  label,
}: {
  isTraderaMarketplaceExcluded: boolean;
  label: string;
}): string => {
  if (isTraderaMarketplaceExcluded) {
    return 'Tradera listing is disabled because Market Exclusion -> Tradera is checked.';
  }
  return label;
};

const resolveTraderaStatusToneClass = (
  disableStatusAction: boolean,
  effectiveStatus: string
): string => {
  if (disableStatusAction) return PRODUCT_LIST_MARKETPLACE_EXCLUDED_TONE_CLASS;
  return getMarketplaceButtonClass(effectiveStatus, true, 'tradera');
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const resolveTraderaRecoveryIdentifiers = (
  persistedFeedback: PersistedTraderaQuickListFeedback | null | undefined
): TraderaRecoveryIdentifiers => {
  if (!persistedFeedback) return EMPTY_TRADERA_RECOVERY_IDENTIFIERS;
  return {
    runId: persistedFeedback.runId ?? null,
    requestId: persistedFeedback.requestId ?? null,
    integrationId: persistedFeedback.integrationId ?? null,
    connectionId: persistedFeedback.connectionId ?? null,
  };
};

const createEffectiveRecoveryContext = (
  effectiveStatus: string,
  persistedFeedback: PersistedTraderaQuickListFeedback | null | undefined
): ProductListingsRecoveryContext | undefined => {
  if (!FAILURE_STATUSES.has(effectiveStatus)) return undefined;
  const identifiers = resolveTraderaRecoveryIdentifiers(persistedFeedback);
  return createTraderaRecoveryContext({
    status: effectiveStatus,
    ...identifiers,
  });
};

const resolveEffectiveTraderaStatus = (
  status: string,
  persistedFeedback: PersistedTraderaQuickListFeedback | null
): string =>
  resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: normalizeMarketplaceStatus(status),
    localFeedbackStatus: persistedFeedback?.status ?? null,
  });

const isTraderaStatusWorkerRunning = (
  effectiveStatus: string,
  persistedFeedback: PersistedTraderaQuickListFeedback | null
): boolean =>
  PROCESSING_STATUSES.has(effectiveStatus) ||
  (effectiveStatus === 'queued' && hasText(persistedFeedback?.runId));

const resolveTraderaStatusToneStatus = ({
  disableStatusAction,
  effectiveStatus,
  isWorkerRunning,
}: {
  disableStatusAction: boolean;
  effectiveStatus: string;
  isWorkerRunning: boolean;
}): string => {
  if (disableStatusAction || !isWorkerRunning) return effectiveStatus;
  return 'queued';
};

const getEnabledPrefetchHandler = (
  disableStatusAction: boolean,
  prefetchListings: () => void
): (() => void) | undefined => (disableStatusAction ? undefined : prefetchListings);

const openTraderaStatusListings = ({
  disableStatusAction,
  onOpenListings,
  recoveryContext,
}: {
  disableStatusAction: boolean;
  onOpenListings: (recoveryContext?: ProductListingsRecoveryContext) => void;
  recoveryContext?: ProductListingsRecoveryContext;
}): void => {
  if (disableStatusAction) return;
  onOpenListings(recoveryContext);
};

export function TraderaStatusButton(props: TraderaStatusButtonProps): React.JSX.Element {
  const { productId, status, prefetchListings, onOpenListings, customFieldValues } = props;
  const customFieldsQuery = useCustomFields();
  const persistedFeedback = readPersistedTraderaQuickListFeedback(productId);
  const effectiveStatus = resolveEffectiveTraderaStatus(status, persistedFeedback);
  const isTraderaMarketplaceExcluded = hasProductMarketplaceExclusionSelection({
    customFieldDefinitions: customFieldsQuery.data,
    customFieldValues,
    marketplaceLabelOrAlias: 'Tradera',
  });
  const isEffectiveFailureState = FAILURE_STATUSES.has(effectiveStatus);
  const recoveryContext = createEffectiveRecoveryContext(effectiveStatus, persistedFeedback);
  const disableStatusAction = isTraderaMarketplaceExcluded;
  const label = resolveTraderaStatusLabel({
    disableStatusAction,
    isEffectiveFailureState,
    effectiveStatus,
  });
  const title = resolveTraderaStatusTitle({ isTraderaMarketplaceExcluded, label });
  const isWorkerRunning = isTraderaStatusWorkerRunning(effectiveStatus, persistedFeedback);
  const toneStatus = resolveTraderaStatusToneStatus({
    disableStatusAction,
    effectiveStatus,
    isWorkerRunning,
  });
  const resolvedToneClass = resolveTraderaStatusToneClass(
    disableStatusAction,
    toneStatus
  );
  const prefetchHandler = getEnabledPrefetchHandler(disableStatusAction, prefetchListings);

  return (
    <ProductListMarketplaceTextButton
      type='button'
      onClick={() =>
        openTraderaStatusListings({
          disableStatusAction,
          onOpenListings,
          recoveryContext,
        })
      }
      onMouseEnter={prefetchHandler}
      onFocus={prefetchHandler}
      disabled={disableStatusAction}
      aria-label={label}
      title={title}
      disabledInteractionClass={
        disableStatusAction && PRODUCT_LIST_MARKETPLACE_EXCLUDED_INTERACTION_CLASS
      }
      isPulsing={isWorkerRunning}
      toneClass={resolvedToneClass}
      label='T'
    />
  );
}
