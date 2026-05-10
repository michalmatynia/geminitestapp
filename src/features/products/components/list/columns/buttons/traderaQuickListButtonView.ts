import {
  createTraderaRecoveryContext,
} from '@/features/integrations/product-integrations-adapter';
import type { PersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
  PROCESSING_STATUSES,
  resolveMarketplaceStatusWithLocalFeedback,
} from '../product-column-utils';

const MARKET_EXCLUSION_DISABLED_CLASS =
  'border-slate-700/35 bg-slate-950/40 text-slate-500 hover:border-slate-700/35 hover:bg-slate-950/40 hover:text-slate-500';

const MARKET_EXCLUSION_DISABLED_INTERACTION_CLASS =
  'cursor-not-allowed disabled:border-slate-700/35 disabled:bg-slate-950/40 disabled:text-slate-500 disabled:opacity-40';

export const GENERIC_DISABLED_INTERACTION_CLASS = 'cursor-not-allowed opacity-60';

type RecoveryIdentifiers = {
  runId: string | null;
  failureReason: string | null;
  requestId: string | null;
  integrationId: string | null;
  connectionId: string | null;
};

const EMPTY_RECOVERY_IDENTIFIERS: RecoveryIdentifiers = {
  runId: null,
  failureReason: null,
  requestId: null,
  integrationId: null,
  connectionId: null,
};

export type TraderaQuickListButtonViewInput = {
  normalizedTraderaStatus: string;
  localFeedbackStatus: string | null;
  localFeedback: PersistedTraderaQuickListFeedback | null;
  submitting: boolean;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  isTraderaMarketplaceExcluded: boolean;
  traderaStatus: string;
  isClosedTraderaStatus: boolean;
};

export type TraderaQuickListButtonViewModel = {
  resolvedButtonStatus: string;
  resolvedLabel: string;
  title: string;
  resolvedToneClass: string;
  disabledInteractionClass: string | false;
  disableQuickListAction: boolean;
  shouldPrefetchListings: boolean;
  isFailureState: boolean;
  isProcessingOrQueued: boolean;
  recoveryContext: ProductListingsRecoveryContext | undefined;
  isTraderaMarketplaceExcluded: boolean;
};

const resolveRecoveryIdentifiers = (
  feedback: PersistedTraderaQuickListFeedback | null
): RecoveryIdentifiers => {
  if (!feedback) return EMPTY_RECOVERY_IDENTIFIERS;
  return {
    runId: feedback.runId ?? null,
    failureReason: feedback.failureReason ?? null,
    requestId: feedback.requestId ?? null,
    integrationId: feedback.integrationId ?? null,
    connectionId: feedback.connectionId ?? null,
  };
};

const resolveRecoveryContext = (
  status: string,
  isFailureState: boolean,
  feedback: PersistedTraderaQuickListFeedback | null
): ProductListingsRecoveryContext | undefined => {
  if (!isFailureState) return undefined;
  return createTraderaRecoveryContext({
    status,
    ...resolveRecoveryIdentifiers(feedback),
  });
};

const resolveButtonLabel = (
  isTraderaMarketplaceExcluded: boolean,
  isFailureState: boolean,
  status: string
): string => {
  if (isTraderaMarketplaceExcluded) return 'Tradera quick export disabled by Market Exclusion';
  if (isFailureState) return `Open Tradera recovery options (${status}).`;
  return 'One-click export to Tradera';
};

const resolveTitleStatusSuffix = (
  traderaStatus: string,
  isClosedTraderaStatus: boolean
): string => {
  if (traderaStatus.length === 0) return '';
  if (isClosedTraderaStatus) return '';
  return ` / ${traderaStatus}`;
};

const resolveButtonTitle = ({
  isTraderaMarketplaceExcluded,
  label,
  status,
  traderaStatus,
  isClosedTraderaStatus,
}: {
  isTraderaMarketplaceExcluded: boolean;
  label: string;
  status: string;
  traderaStatus: string;
  isClosedTraderaStatus: boolean;
}): string => {
  if (isTraderaMarketplaceExcluded === true) {
    return 'Tradera quick export is disabled because Market Exclusion -> Tradera is checked.';
  }
  return `${label} (${status}${resolveTitleStatusSuffix(traderaStatus, isClosedTraderaStatus)})`;
};

const resolveDisableQuickListAction = ({
  isTraderaMarketplaceExcluded,
  isFailureState,
  submitting,
  localFeedbackStatus,
  serverStatusInFlight,
  resolvedButtonStatus,
}: {
  isTraderaMarketplaceExcluded: boolean;
  isFailureState: boolean;
  submitting: boolean;
  localFeedbackStatus: string | null;
  serverStatusInFlight: boolean;
  resolvedButtonStatus: string;
}): boolean =>
  isTraderaMarketplaceExcluded ||
  (!isFailureState &&
    (submitting ||
      localFeedbackStatus === 'queued' ||
      serverStatusInFlight ||
      PROCESSING_STATUSES.has(normalizeMarketplaceStatus(resolvedButtonStatus))));

const resolveToneClass = (
  isTraderaMarketplaceExcluded: boolean,
  status: string,
  shouldUseFilledMarketplaceTone: boolean
): string => {
  if (isTraderaMarketplaceExcluded) return MARKET_EXCLUSION_DISABLED_CLASS;
  return getMarketplaceButtonClass(status, shouldUseFilledMarketplaceTone, 'tradera');
};

const resolveDisabledInteractionClass = (
  isTraderaMarketplaceExcluded: boolean,
  disableQuickListAction: boolean
): string | false => {
  if (isTraderaMarketplaceExcluded) return MARKET_EXCLUSION_DISABLED_INTERACTION_CLASS;
  return disableQuickListAction && GENERIC_DISABLED_INTERACTION_CLASS;
};

export const resolveTraderaQuickListButtonView = (
  input: TraderaQuickListButtonViewInput
): TraderaQuickListButtonViewModel => {
  const resolvedButtonStatus = resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: input.normalizedTraderaStatus,
    localFeedbackStatus: input.localFeedbackStatus,
    submitting: input.submitting,
  });
  const isFailureState = FAILURE_STATUSES.has(normalizeMarketplaceStatus(resolvedButtonStatus));
  const shouldUseFilledMarketplaceTone =
    input.hasServerStatus || input.localFeedbackStatus !== null;
  const disableQuickListAction = resolveDisableQuickListAction({
    isTraderaMarketplaceExcluded: input.isTraderaMarketplaceExcluded,
    isFailureState,
    submitting: input.submitting,
    localFeedbackStatus: input.localFeedbackStatus,
    serverStatusInFlight: input.serverStatusInFlight,
    resolvedButtonStatus,
  });
  const resolvedLabel = resolveButtonLabel(
    input.isTraderaMarketplaceExcluded,
    isFailureState,
    resolvedButtonStatus
  );

  return {
    resolvedButtonStatus,
    resolvedLabel,
    title: resolveButtonTitle({
      isTraderaMarketplaceExcluded: input.isTraderaMarketplaceExcluded,
      label: resolvedLabel,
      status: resolvedButtonStatus,
      traderaStatus: input.traderaStatus,
      isClosedTraderaStatus: input.isClosedTraderaStatus,
    }),
    resolvedToneClass: resolveToneClass(
      input.isTraderaMarketplaceExcluded,
      resolvedButtonStatus,
      shouldUseFilledMarketplaceTone
    ),
    disabledInteractionClass: resolveDisabledInteractionClass(
      input.isTraderaMarketplaceExcluded,
      disableQuickListAction
    ),
    disableQuickListAction,
    shouldPrefetchListings: !disableQuickListAction,
    isFailureState,
    isProcessingOrQueued:
      PROCESSING_STATUSES.has(normalizeMarketplaceStatus(resolvedButtonStatus)) ||
      resolvedButtonStatus === 'queued',
    recoveryContext: resolveRecoveryContext(
      resolvedButtonStatus,
      isFailureState,
      input.localFeedback
    ),
    isTraderaMarketplaceExcluded: input.isTraderaMarketplaceExcluded,
  };
};
