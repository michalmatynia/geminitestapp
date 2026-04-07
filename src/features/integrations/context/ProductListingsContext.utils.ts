import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import {
  isTraderaQuickExportRecoveryContext,
  isVintedQuickExportRecoveryContext,
} from '@/features/integrations/utils/product-listings-recovery';

export const doesTraderaRecoveryContextMatchFeedback = (
  recoveryContext: ProductListingsRecoveryContext | null,
  feedback: {
    requestId?: string | null | undefined;
    runId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  } | null
): boolean => {
  if (!isTraderaQuickExportRecoveryContext(recoveryContext) || !feedback) {
    return false;
  }

  if (recoveryContext.requestId && feedback.requestId) {
    return recoveryContext.requestId === feedback.requestId;
  }

  if (recoveryContext.runId && feedback.runId) {
    return recoveryContext.runId === feedback.runId;
  }

  if (
    recoveryContext.integrationId &&
    feedback.integrationId &&
    recoveryContext.connectionId &&
    feedback.connectionId
  ) {
    return (
      recoveryContext.integrationId === feedback.integrationId &&
      recoveryContext.connectionId === feedback.connectionId
    );
  }

  return true;
};

export const doesVintedRecoveryContextMatchFeedback = (
  recoveryContext: ProductListingsRecoveryContext | null,
  feedback: {
    requestId?: string | null | undefined;
    runId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  } | null
): boolean => {
  if (!isVintedQuickExportRecoveryContext(recoveryContext) || !feedback) {
    return false;
  }

  if (recoveryContext.requestId && feedback.requestId) {
    return recoveryContext.requestId === feedback.requestId;
  }

  if (recoveryContext.runId && feedback.runId) {
    return recoveryContext.runId === feedback.runId;
  }

  if (
    recoveryContext.integrationId &&
    feedback.integrationId &&
    recoveryContext.connectionId &&
    feedback.connectionId
  ) {
    return (
      recoveryContext.integrationId === feedback.integrationId &&
      recoveryContext.connectionId === feedback.connectionId
    );
  }

  return true;
};
