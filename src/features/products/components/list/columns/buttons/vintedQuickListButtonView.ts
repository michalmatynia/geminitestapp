import { createVintedRecoveryContext } from '@/features/integrations/product-integrations-adapter';
import type { PersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';

import {
  FAILURE_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
  resolveMarketplaceStatusWithLocalFeedback,
} from '../product-column-utils';

const GENERIC_DISABLED_INTERACTION_CLASS = 'cursor-not-allowed opacity-60';

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

export type VintedQuickListButtonViewInput = {
  normalizedVintedStatus: string;
  localFeedbackStatus: string | null;
  localFeedback: PersistedVintedQuickListFeedback | null;
  submitting: boolean;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  vintedStatus: string;
};

export type VintedQuickListButtonViewModel = {
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
};

const resolveRecoveryIdentifiers = (
  feedback: PersistedVintedQuickListFeedback | null
): RecoveryIdentifiers => {
  if (feedback === null) return EMPTY_RECOVERY_IDENTIFIERS;
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
  feedback: PersistedVintedQuickListFeedback | null
): ProductListingsRecoveryContext | undefined => {
  if (!isFailureState) return undefined;
  return createVintedRecoveryContext({
    status,
    ...resolveRecoveryIdentifiers(feedback),
  });
};

const resolveButtonLabel = (isFailureState: boolean, status: string): string => {
  if (isFailureState) return `Open Vinted recovery options (${status}).`;
  return 'One-click export to Vinted.pl';
};

const resolveTitleStatusSuffix = (vintedStatus: string): string => {
  if (vintedStatus.length === 0) return '';
  return ` / ${vintedStatus}`;
};

const resolveDisableQuickListAction = ({
  isFailureState,
  localFeedbackStatus,
  serverStatusInFlight,
  submitting,
}: {
  isFailureState: boolean;
  localFeedbackStatus: string | null;
  serverStatusInFlight: boolean;
  submitting: boolean;
}): boolean =>
  !isFailureState && (submitting || localFeedbackStatus === 'queued' || serverStatusInFlight);

const resolveDisabledInteractionClass = (disableQuickListAction: boolean): string | false =>
  disableQuickListAction && GENERIC_DISABLED_INTERACTION_CLASS;

export const resolveVintedQuickListButtonView = (
  input: VintedQuickListButtonViewInput
): VintedQuickListButtonViewModel => {
  const resolvedButtonStatus = resolveMarketplaceStatusWithLocalFeedback({
    serverStatus: input.normalizedVintedStatus,
    localFeedbackStatus: input.localFeedbackStatus,
    submitting: input.submitting,
  });
  const isFailureState = FAILURE_STATUSES.has(normalizeMarketplaceStatus(resolvedButtonStatus));
  const shouldUseFilledMarketplaceTone =
    input.hasServerStatus || input.localFeedbackStatus !== null;
  const disableQuickListAction = resolveDisableQuickListAction({
    isFailureState,
    submitting: input.submitting,
    localFeedbackStatus: input.localFeedbackStatus,
    serverStatusInFlight: input.serverStatusInFlight,
  });
  const resolvedLabel = resolveButtonLabel(isFailureState, resolvedButtonStatus);

  return {
    resolvedButtonStatus,
    resolvedLabel,
    title: `${resolvedLabel} (${resolvedButtonStatus}${resolveTitleStatusSuffix(input.vintedStatus)})`,
    resolvedToneClass: getMarketplaceButtonClass(
      resolvedButtonStatus,
      shouldUseFilledMarketplaceTone,
      'vinted'
    ),
    disabledInteractionClass: resolveDisabledInteractionClass(disableQuickListAction),
    disableQuickListAction,
    shouldPrefetchListings: !disableQuickListAction,
    isFailureState,
    isProcessingOrQueued:
      resolvedButtonStatus === 'processing' || resolvedButtonStatus === 'queued',
    recoveryContext: resolveRecoveryContext(
      resolvedButtonStatus,
      isFailureState,
      input.localFeedback
    ),
  };
};
