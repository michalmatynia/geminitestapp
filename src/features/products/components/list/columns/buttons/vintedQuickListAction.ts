import type { QueryClient } from '@tanstack/react-query';

import {
  createVintedRecoveryContext,
  ensureVintedBrowserSession,
  integrationSelectionQueryKeys,
  isVintedBrowserAuthRequiredMessage,
  preflightVintedQuickListSession,
  type ResolvedVintedQuickListContext,
} from '@/features/integrations/product-integrations-adapter';
import type { PersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';
import type {
  ProductListingCreatePayload,
  ProductListingCreateResponse,
  ProductListingsRecoveryContext,
  QuickExportFeedbackOptions,
  QuickExportFeedbackStatus,
} from '@/shared/contracts/integrations/listings';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type Toast = ReturnType<typeof useToast>['toast'];
type RecoveryTarget = Pick<ProductListingCreatePayload, 'integrationId' | 'connectionId'>;
type ResolvedVintedBrowserConnection = NonNullable<
  ResolvedVintedQuickListContext['vintedConnection']
>;

type SetFeedbackStatus = (
  status: QuickExportFeedbackStatus | null,
  options?: QuickExportFeedbackOptions
) => void;

type CreateVintedListing = (
  payload: ProductListingCreatePayload
) => Promise<ProductListingCreateResponse>;

export type RunVintedQuickListActionInput = {
  productId: string;
  queryClient: QueryClient;
  toast: Toast;
  createListing: CreateVintedListing;
  resolveConnection: () => Promise<ResolvedVintedQuickListContext>;
  setFeedbackStatus: SetFeedbackStatus;
  getLocalFeedback: () => PersistedVintedQuickListFeedback | null;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  prefetchListings: () => void;
};

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveRecoveryTarget = (connection: ResolvedVintedBrowserConnection): RecoveryTarget => ({
  integrationId: connection.integrationId,
  connectionId: connection.connection.id,
});

const openAuthRecovery = (
  input: RunVintedQuickListActionInput,
  target: RecoveryTarget,
  feedback: PersistedVintedQuickListFeedback | null
): void => {
  input.onOpenIntegrations?.(
    createVintedRecoveryContext({
      status: 'auth_required',
      runId: feedback?.runId ?? null,
      requestId: feedback?.requestId ?? null,
      integrationId: target.integrationId,
      connectionId: target.connectionId,
    })
  );
};

const resolveRequiredConnection = async (
  input: RunVintedQuickListActionInput
): Promise<ResolvedVintedBrowserConnection | null> => {
  const context = await input.resolveConnection();
  if (context.vintedConnection !== null) return context.vintedConnection;
  input.setFeedbackStatus('failed');
  input.toast('No Vinted connection configured. Add a Vinted connection first.', {
    variant: 'error',
  });
  input.onOpenIntegrations?.();
  return null;
};

const ensureManualSession = async (
  input: RunVintedQuickListActionInput,
  target: RecoveryTarget
): Promise<boolean> => {
  const response = await ensureVintedBrowserSession(target);
  if (response.savedSession) {
    input.toast('Vinted login session refreshed.', { variant: 'success' });
    return true;
  }
  input.setFeedbackStatus('failed', target);
  input.toast(
    'Vinted login session could not be saved. Complete login verification and retry.',
    { variant: 'error' }
  );
  openAuthRecovery(input, target, input.getLocalFeedback());
  return false;
};

const ensureQuickListSession = async (
  input: RunVintedQuickListActionInput,
  target: RecoveryTarget
): Promise<boolean> => {
  const preflight = await preflightVintedQuickListSession(target);
  if (preflight.ready) return true;
  return ensureManualSession(input, target);
};

const persistPreferredConnection = async (
  input: RunVintedQuickListActionInput,
  target: RecoveryTarget
): Promise<void> => {
  try {
    await api.post('/api/v2/integrations/exports/vinted/default-connection', {
      connectionId: target.connectionId,
    });
    input.queryClient.setQueryData(
      normalizeQueryKey(integrationSelectionQueryKeys.vintedDefaultConnection),
      { connectionId: target.connectionId }
    );
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'VintedQuickListButton',
      action: 'persistPreferredConnection',
      productId: input.productId,
      connectionId: target.connectionId,
      level: 'warn',
    });
  }
};

const resolveQueuedMessage = (queueJobId: string | null): string =>
  queueJobId !== null
    ? `Vinted listing queued (job ${queueJobId}).`
    : 'Vinted listing queued.';

const queueVintedListing = async (
  input: RunVintedQuickListActionInput,
  target: RecoveryTarget
): Promise<void> => {
  const response = await input.createListing(target);
  const listingId = readNonEmptyString(response.id);
  const queueJobId = readNonEmptyString(response.queue?.jobId);

  input.setFeedbackStatus('queued', {
    ...target,
    listingId,
    requestId: queueJobId,
  });
  await persistPreferredConnection(input, target);
  input.toast(resolveQueuedMessage(queueJobId), { variant: 'success' });
  input.prefetchListings();
  await invalidateProductListingsAndBadges(input.queryClient, input.productId);
  await invalidateProducts(input.queryClient);
};

const isNonAuthConflict = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status === 409 &&
  !isVintedBrowserAuthRequiredMessage(error.message);

const handleConflictError = (input: RunVintedQuickListActionInput, error: ApiError): void => {
  input.setFeedbackStatus(null);
  input.toast(
    error.message.length > 0
      ? error.message
      : 'This product already has a Vinted listing on this account.',
    { variant: 'error' }
  );
  input.onOpenIntegrations?.();
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to queue Vinted listing.';

const resolveFailureFeedbackOptions = (
  target: RecoveryTarget | undefined,
  authRequired: boolean,
  errorMessage: string
): QuickExportFeedbackOptions => ({
  ...target,
  failureReason: authRequired ? null : errorMessage,
});

const handleGeneralError = (
  input: RunVintedQuickListActionInput,
  error: unknown,
  target: RecoveryTarget | undefined
): void => {
  const errorMessage = resolveErrorMessage(error);
  const authRequired = isVintedBrowserAuthRequiredMessage(errorMessage);
  input.setFeedbackStatus(
    authRequired ? 'auth_required' : 'failed',
    resolveFailureFeedbackOptions(target, authRequired, errorMessage)
  );
  logClientCatch(error, {
    source: 'VintedQuickListButton',
    action: 'quickList',
    productId: input.productId,
  });
  input.toast(errorMessage, { variant: 'error' });
  if (authRequired && target !== undefined) {
    openAuthRecovery(input, target, input.getLocalFeedback());
  }
};

const handleVintedQuickListError = (
  input: RunVintedQuickListActionInput,
  error: unknown,
  target: RecoveryTarget | undefined
): void => {
  if (isNonAuthConflict(error)) {
    handleConflictError(input, error);
    return;
  }
  handleGeneralError(input, error, target);
};

export const runVintedQuickListAction = async (
  input: RunVintedQuickListActionInput
): Promise<void> => {
  let target: RecoveryTarget | undefined;
  try {
    const connection = await resolveRequiredConnection(input);
    if (connection === null) return;
    target = resolveRecoveryTarget(connection);
    input.setFeedbackStatus('processing', target);
    if (!(await ensureQuickListSession(input, target))) return;
    await queueVintedListing(input, target);
  } catch (error: unknown) {
    handleVintedQuickListError(input, error, target);
  }
};
