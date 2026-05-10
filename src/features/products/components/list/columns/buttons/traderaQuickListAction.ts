import type { QueryClient } from '@tanstack/react-query';

import {
  createTraderaRecoveryContext,
  ensureTraderaBrowserSession,
  integrationSelectionQueryKeys,
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
  type ResolvedTraderaBrowserConnection,
  type ResolvedTraderaQuickListContext,
} from '@/features/integrations/product-integrations-adapter';
import type { PersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
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

type ConnectionTarget = Pick<ProductListingCreatePayload, 'integrationId' | 'connectionId'>;

type RecoveryTarget = ConnectionTarget &
  Required<Pick<ProductListingCreatePayload, 'browserMode'>>;

type SetFeedbackStatus = (
  status: QuickExportFeedbackStatus | null,
  options?: QuickExportFeedbackOptions
) => void;

type CreateTraderaListing = (
  payload: ProductListingCreatePayload
) => Promise<ProductListingCreateResponse>;

type TraderaQuickListConnectionActions = {
  resolveConnection: () => Promise<ResolvedTraderaQuickListContext>;
  enableDefaultScriptedConnection: (
    context: ResolvedTraderaQuickListContext
  ) => Promise<ResolvedTraderaBrowserConnection | null>;
};

export type RunTraderaQuickListActionInput = TraderaQuickListConnectionActions & {
  productId: string;
  browserMode: RecoveryTarget['browserMode'];
  queryClient: QueryClient;
  toast: Toast;
  createListing: CreateTraderaListing;
  setFeedbackStatus: SetFeedbackStatus;
  getLocalFeedback: () => PersistedTraderaQuickListFeedback | null;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  prefetchListings: () => void;
};

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveRecoveryTarget = (
  connection: ResolvedTraderaBrowserConnection,
  browserMode: RecoveryTarget['browserMode']
): RecoveryTarget => ({
  integrationId: connection.integrationId,
  connectionId: connection.connection.id,
  browserMode,
});

const toConnectionTarget = (target: ConnectionTarget): ConnectionTarget => ({
  integrationId: target.integrationId,
  connectionId: target.connectionId,
});

const openAuthRecovery = (
  input: RunTraderaQuickListActionInput,
  target: RecoveryTarget,
  feedback: PersistedTraderaQuickListFeedback | null
): void => {
  input.onOpenIntegrations?.(
    createTraderaRecoveryContext({
      status: 'auth_required',
      runId: feedback?.runId ?? null,
      requestId: feedback?.requestId ?? null,
      integrationId: target.integrationId,
      connectionId: target.connectionId,
    })
  );
};

const resolveScriptedConnection = async (
  input: TraderaQuickListConnectionActions
): Promise<ResolvedTraderaBrowserConnection | null> => {
  const context = await input.resolveConnection();
  return context.scriptedConnection ?? input.enableDefaultScriptedConnection(context);
};

const resolveRequiredConnection = async (
  input: RunTraderaQuickListActionInput
): Promise<ResolvedTraderaBrowserConnection | null> => {
  const connection = await resolveScriptedConnection(input);
  if (connection !== null) return connection;
  input.setFeedbackStatus('failed');
  input.toast(
    'No Tradera browser connection configured for Quicklist. Add a Tradera browser connection first.',
    { variant: 'error' }
  );
  input.onOpenIntegrations?.();
  return null;
};

const ensureManualSession = async (
  input: RunTraderaQuickListActionInput,
  target: RecoveryTarget
): Promise<boolean> => {
  const response = await ensureTraderaBrowserSession(toConnectionTarget(target));
  if (response.savedSession) {
    input.toast('Tradera login session refreshed.', { variant: 'success' });
    return true;
  }
  input.setFeedbackStatus('failed', toConnectionTarget(target));
  input.toast(
    'Tradera login session could not be saved. Complete login verification and retry.',
    { variant: 'error' }
  );
  openAuthRecovery(input, target, input.getLocalFeedback());
  return false;
};

const ensureQuickListSession = async (
  input: RunTraderaQuickListActionInput,
  target: RecoveryTarget
): Promise<boolean> => {
  const preflight = await preflightTraderaQuickListSession(toConnectionTarget(target));
  if (preflight.ready) return true;
  return ensureManualSession(input, target);
};

const persistPreferredConnection = async (
  input: RunTraderaQuickListActionInput,
  target: RecoveryTarget
): Promise<void> => {
  try {
    await api.post('/api/v2/integrations/exports/tradera/default-connection', {
      connectionId: target.connectionId,
    });
    input.queryClient.setQueryData(
      normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
      { connectionId: target.connectionId }
    );
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'TraderaQuickListButton',
      action: 'persistPreferredConnection',
      productId: input.productId,
      connectionId: target.connectionId,
      level: 'warn',
    });
  }
};

const resolveQueuedMessage = (queueJobId: string | null): string =>
  queueJobId !== null
    ? `Tradera listing queued (job ${queueJobId}).`
    : 'Tradera listing queued.';

const queueTraderaListing = async (
  input: RunTraderaQuickListActionInput,
  target: RecoveryTarget
): Promise<void> => {
  const response = await input.createListing(target);
  const listingId = readNonEmptyString(response.id);
  const queueJobId = readNonEmptyString(response.queue?.jobId);
  const feedbackTarget = toConnectionTarget(target);

  input.setFeedbackStatus('queued', {
    ...feedbackTarget,
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
  !isTraderaBrowserAuthRequiredMessage(error.message);

const handleConflictError = (
  input: RunTraderaQuickListActionInput,
  error: ApiError
): void => {
  input.setFeedbackStatus(null);
  input.toast(
    error.message.length > 0
      ? error.message
      : 'This product already has a Tradera listing on this account.',
    { variant: 'error' }
  );
  input.onOpenIntegrations?.();
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to queue Tradera listing.';

const resolveFailureFeedbackOptions = (
  target: RecoveryTarget | undefined,
  authRequired: boolean,
  errorMessage: string
): QuickExportFeedbackOptions => ({
  ...(target ? toConnectionTarget(target) : undefined),
  failureReason: authRequired ? null : errorMessage,
});

const handleGeneralError = (
  input: RunTraderaQuickListActionInput,
  error: unknown,
  target: RecoveryTarget | undefined
): void => {
  const errorMessage = resolveErrorMessage(error);
  const authRequired = isTraderaBrowserAuthRequiredMessage(errorMessage);
  input.setFeedbackStatus(
    authRequired ? 'auth_required' : 'failed',
    resolveFailureFeedbackOptions(target, authRequired, errorMessage)
  );
  logClientCatch(error, {
    source: 'TraderaQuickListButton',
    action: 'quickList',
    productId: input.productId,
  });
  input.toast(errorMessage, { variant: 'error' });
  if (authRequired && target !== undefined) {
    openAuthRecovery(input, target, input.getLocalFeedback());
  }
};

const handleTraderaQuickListError = (
  input: RunTraderaQuickListActionInput,
  error: unknown,
  target: RecoveryTarget | undefined
): void => {
  if (isNonAuthConflict(error)) {
    handleConflictError(input, error);
    return;
  }
  handleGeneralError(input, error, target);
};

export const runTraderaQuickListAction = async (
  input: RunTraderaQuickListActionInput
): Promise<void> => {
  let target: RecoveryTarget | undefined;
  try {
    const connection = await resolveRequiredConnection(input);
    if (connection === null) return;
    target = resolveRecoveryTarget(connection, input.browserMode);
    input.setFeedbackStatus('processing', toConnectionTarget(target));
    if (!(await ensureQuickListSession(input, target))) return;
    await queueTraderaListing(input, target);
  } catch (error: unknown) {
    handleTraderaQuickListError(input, error, target);
  }
};
