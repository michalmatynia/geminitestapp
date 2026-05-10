import React from 'react';

import {
  TraderaCompactRecoveryBanner,
  TraderaFullRecoveryBanner,
  type TraderaRecoveryBannerViewModel,
} from './TraderaQuickExportRecoveryBanner.parts';

type TraderaQuickExportRecoveryBannerProps = {
  mode: 'empty' | 'content';
  status: string | null | undefined;
  requestId?: string | null | undefined;
  runId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  canContinue?: boolean;
  variant?: 'compact' | 'full';
};

type BannerCopyInput = {
  canContinue: boolean;
  failureReason: string | null;
  mode: TraderaQuickExportRecoveryBannerProps['mode'];
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeText = (value: string | null | undefined): string | null =>
  hasText(value) ? value.trim() : null;

const isTraderaCategoryMapperFailure = (failureReason: string | null | undefined): boolean => {
  const normalized = (failureReason ?? '').trim().toLowerCase();
  if (normalized.length === 0) return false;
  return (
    normalized.includes('category mapper') ||
    normalized.includes('category mapping') ||
    normalized.includes('fetch tradera categories')
  );
};

const isTraderaShippingGroupFailure = (failureReason: string | null | undefined): boolean => {
  const normalized = (failureReason ?? '').trim().toLowerCase();
  if (normalized.length === 0) return false;
  return (
    normalized.includes('shipping group') ||
    normalized.includes('shipping price in eur') ||
    normalized.includes('tradera shipping price')
  );
};

const resolveCategoryMapperHref = (connectionId: string | null): string | null =>
  connectionId !== null
    ? `/admin/integrations/marketplaces/tradera/category-mapping?connectionId=${encodeURIComponent(connectionId)}`
    : null;

const resolveBannerTitle = ({ mode, canContinue }: BannerCopyInput): string => {
  if (mode === 'empty') return 'Tradera quick export needs recovery';
  if (canContinue) return 'Tradera quick export requires recovery';
  return 'Tradera quick export needs attention';
};

const resolveBannerDescription = ({
  mode,
  canContinue,
  failureReason,
}: BannerCopyInput): React.ReactNode => {
  if (mode === 'empty' && !canContinue && failureReason !== null) {
    return failureReason;
  }
  if (mode === 'empty') {
    return 'The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then choose whether to relist or sync from this modal.';
  }
  if (!canContinue && failureReason !== null) {
    return failureReason;
  }
  return (
    <>
      Review the Tradera listing below and use
      <span className='font-semibold text-white'> Login to Tradera </span>
      if the last run needs manual verification. After login, choose relist or sync manually.
    </>
  );
};

const buildBannerViewModel = ({
  mode,
  runId,
  integrationId,
  connectionId,
  failureReason,
  canContinue: requestedCanContinue,
}: TraderaQuickExportRecoveryBannerProps): TraderaRecoveryBannerViewModel => {
  const normalizedRunId = normalizeText(runId) ?? '';
  const hasRunId = normalizedRunId.length > 0;
  const normalizedIntegrationId = normalizeText(integrationId);
  const normalizedConnectionId = normalizeText(connectionId);
  const hasContinueTarget = normalizedIntegrationId !== null && normalizedConnectionId !== null;
  const canContinue = requestedCanContinue ?? hasContinueTarget;
  const normalizedFailureReason = normalizeText(failureReason);
  const categoryMapperHref = resolveCategoryMapperHref(normalizedConnectionId);
  const canOpenCategoryMapper =
    !canContinue &&
    categoryMapperHref !== null &&
    isTraderaCategoryMapperFailure(normalizedFailureReason);
  const canOpenShippingGroups =
    !canContinue && isTraderaShippingGroupFailure(normalizedFailureReason);
  const copyInput: BannerCopyInput = {
    mode,
    canContinue,
    failureReason: normalizedFailureReason,
  };
  const title = resolveBannerTitle(copyInput);
  const description = resolveBannerDescription(copyInput);

  return {
    canContinue,
    canOpenCategoryMapper,
    canOpenShippingGroups,
    categoryMapperHref,
    description,
    hasRunId,
    normalizedConnectionId,
    normalizedIntegrationId,
    normalizedRunId,
    title,
  };
};

export function TraderaQuickExportRecoveryBanner(
  props: TraderaQuickExportRecoveryBannerProps
): React.JSX.Element {
  const view = buildBannerViewModel(props);
  if ((props.variant ?? 'compact') === 'full') {
    return (
      <TraderaFullRecoveryBanner
        requestId={props.requestId}
        status={props.status}
        view={view}
      />
    );
  }

  return <TraderaCompactRecoveryBanner requestId={props.requestId} view={view} />;
}
