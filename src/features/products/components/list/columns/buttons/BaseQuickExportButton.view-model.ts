import { createBaseRecoveryContext } from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import {
  resolveTriggerButtonRunFeedbackPresentation,
  type TriggerButtonRunFeedbackStatus,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';

import { FAILURE_STATUSES, PENDING_STATUSES, PROCESSING_STATUSES, SUCCESS_STATUSES, normalizeMarketplaceStatus } from '../product-column-utils';
import { TERMINAL_EXPORT_RUN_STATUSES } from './BaseQuickExportButton.constants';

export type BaseQuickExportButtonViewStateInput = {
  status: string;
  showMarketplaceBadge: boolean;
  quickExportMutationPending: boolean;
  quickExportLocked: boolean;
  trackedExportRunStatus: TriggerButtonRunFeedbackStatus | null;
  trackedExportRunContextId: string | null;
  trackedExportRunErrorMessage: string | null;
};

export type BaseQuickExportButtonViewState = {
  quickExportPending: boolean;
  resolvedButtonStatus: string;
  resolvedLabel: string;
  shouldManageExistingListing: boolean;
  shouldUseFilledMarketplaceTone: boolean;
  isFailureState: boolean;
  recoveryContext: ProductListingsRecoveryContext | undefined;
};

const resolveTrackedExportInFlight = (
  status: TriggerButtonRunFeedbackStatus | null
): boolean => status !== null && TERMINAL_EXPORT_RUN_STATUSES.has(status) === false;

const resolveShouldManageExistingListing = (
  isFailureState: boolean,
  isServerInProgressState: boolean,
  showMarketplaceBadge: boolean,
  normalizedResolvedButtonStatus: string
): boolean =>
  isFailureState === false &&
  isServerInProgressState === false &&
  (showMarketplaceBadge || SUCCESS_STATUSES.has(normalizedResolvedButtonStatus));

const resolveBaseQuickExportLabel = ({
  defaultLabel,
  isFailureState,
  shouldManageExistingListing,
  resolvedButtonStatus,
  trackedExportRunStatus,
}: {
  defaultLabel: string;
  isFailureState: boolean;
  shouldManageExistingListing: boolean;
  resolvedButtonStatus: string;
  trackedExportRunStatus: TriggerButtonRunFeedbackStatus | null;
}): string => {
  if (isFailureState) return `Open Base.com recovery options (${resolvedButtonStatus}).`;
  if (shouldManageExistingListing) return `Manage Base.com listing (${resolvedButtonStatus}).`;
  if (trackedExportRunStatus === null) return defaultLabel;
  const presentation = resolveTriggerButtonRunFeedbackPresentation(trackedExportRunStatus);
  return `Base.com export ${presentation.label.toLowerCase()}.`;
};

const resolveRecoveryContext = (
  input: BaseQuickExportButtonViewStateInput,
  isFailureState: boolean,
  resolvedButtonStatus: string
): ProductListingsRecoveryContext | undefined => {
  if (isFailureState === false) return undefined;
  return createBaseRecoveryContext({
    status: resolvedButtonStatus,
    runId: input.trackedExportRunContextId,
    failureReason: input.trackedExportRunErrorMessage,
  });
};

export const resolveBaseQuickExportButtonViewState = (
  input: BaseQuickExportButtonViewStateInput
): BaseQuickExportButtonViewState => {
  const trackedExportInFlight = resolveTrackedExportInFlight(input.trackedExportRunStatus);
  const localExportPending = input.quickExportMutationPending || input.quickExportLocked;
  const quickExportPending = localExportPending || trackedExportInFlight;
  const resolvedButtonStatus =
    input.trackedExportRunStatus ?? (localExportPending ? 'pending' : input.status);
  const normalizedStatus = normalizeMarketplaceStatus(resolvedButtonStatus);
  const isFailureState = FAILURE_STATUSES.has(normalizedStatus);
  const isServerInProgressState =
    PENDING_STATUSES.has(normalizedStatus) || PROCESSING_STATUSES.has(normalizedStatus);
  const shouldManageExistingListing = resolveShouldManageExistingListing(
    isFailureState,
    isServerInProgressState,
    input.showMarketplaceBadge,
    normalizedStatus
  );
  const resolvedLabel = resolveBaseQuickExportLabel({
    defaultLabel: 'One-click export to Base.com',
    isFailureState,
    shouldManageExistingListing,
    resolvedButtonStatus,
    trackedExportRunStatus: input.trackedExportRunStatus,
  });

  return {
    quickExportPending,
    resolvedButtonStatus,
    resolvedLabel,
    shouldManageExistingListing,
    shouldUseFilledMarketplaceTone:
      input.showMarketplaceBadge || input.trackedExportRunStatus !== null || localExportPending,
    isFailureState,
    recoveryContext: resolveRecoveryContext(input, isFailureState, resolvedButtonStatus),
  };
};
