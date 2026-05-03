import {
  isTraderaIntegrationSlug,
  isTraderaQuickExportRecoveryContext,
  isVintedIntegrationSlug,
  isVintedQuickExportRecoveryContext,
  readPersistedTraderaQuickListFeedback,
  readPersistedVintedQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';

type PersistedQuickListFeedback = ReturnType<typeof readPersistedTraderaQuickListFeedback>;

const isQuickExportRecoveryContext = (
  recoveryContext: ProductListingsRecoveryContext
): boolean =>
  isTraderaQuickExportRecoveryContext(recoveryContext) ||
  isVintedQuickExportRecoveryContext(recoveryContext);

const readPersistedQuickListFeedback = (
  productId: string,
  recoveryContext: ProductListingsRecoveryContext
): PersistedQuickListFeedback =>
  isTraderaQuickExportRecoveryContext(recoveryContext)
    ? readPersistedTraderaQuickListFeedback(productId)
    : readPersistedVintedQuickListFeedback(productId);

const isPendingQuickListFeedbackStatus = (status: string): boolean => {
  const normalizedStatus = status.trim().toLowerCase();
  return (
    normalizedStatus === 'processing' ||
    normalizedStatus === 'queued' ||
    normalizedStatus === 'completed'
  );
};

const resolveNullableString = (
  value: string | null | undefined,
  fallback: string | null | undefined
): string | null => value ?? fallback ?? null;

const resolveRecoveryFailureReason = (
  recoveryContext: ProductListingsRecoveryContext,
  persistedFailureReason: string | null | undefined
): string | null => {
  const recoveryFailureReason =
    'failureReason' in recoveryContext ? recoveryContext.failureReason : null;
  return resolveNullableString(recoveryFailureReason, persistedFailureReason);
};

const buildEnrichedRecoveryContext = (
  recoveryContext: ProductListingsRecoveryContext,
  persistedFeedback: NonNullable<PersistedQuickListFeedback>
): ProductListingsRecoveryContext => ({
  ...recoveryContext,
  runId: resolveNullableString(recoveryContext.runId, persistedFeedback.runId),
  failureReason: resolveRecoveryFailureReason(recoveryContext, persistedFeedback.failureReason),
  requestId: resolveNullableString(recoveryContext.requestId, persistedFeedback.requestId),
  integrationId: resolveNullableString(recoveryContext.integrationId, persistedFeedback.integrationId),
  connectionId: resolveNullableString(recoveryContext.connectionId, persistedFeedback.connectionId),
});

export const enrichRecoveryContext = (
  productId: string,
  recoveryContext?: ProductListingsRecoveryContext
): ProductListingsRecoveryContext | null => {
  if (recoveryContext === undefined) return null;
  if (!isQuickExportRecoveryContext(recoveryContext)) return recoveryContext;

  const persistedFeedback = readPersistedQuickListFeedback(productId, recoveryContext);
  if (persistedFeedback === null) return recoveryContext;
  if (isPendingQuickListFeedbackStatus(persistedFeedback.status)) return null;
  return buildEnrichedRecoveryContext(recoveryContext, persistedFeedback);
};

export const shouldRefreshListingsForScope = (
  resolvedFilterIntegrationSlug: string | null,
  recoveryContext?: ProductListingsRecoveryContext
): boolean =>
  isTraderaIntegrationSlug(resolvedFilterIntegrationSlug) ||
  isVintedIntegrationSlug(resolvedFilterIntegrationSlug) ||
  (recoveryContext !== undefined &&
    (isTraderaQuickExportRecoveryContext(recoveryContext) ||
      isVintedQuickExportRecoveryContext(recoveryContext)));
