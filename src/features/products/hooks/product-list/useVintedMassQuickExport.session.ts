import {
  ensureVintedBrowserSession,
  isVintedBrowserAuthRequiredMessage,
  persistVintedQuickListFeedback,
  preflightVintedQuickListSession,
} from '@/features/integrations/product-integrations-adapter';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ResolvedVintedQuickExportConnection } from './useVintedMassQuickExport.connection';

type ToastFn = ReturnType<typeof useToast>['toast'];

type VintedSessionPreparationOptions = {
  connection: ResolvedVintedQuickExportConnection;
  productIds: string[];
  toast: ToastFn;
};

const markProductsForSessionFailure = ({
  connection,
  failureReason,
  productIds,
  status,
}: {
  connection: ResolvedVintedQuickExportConnection;
  failureReason?: string | null;
  productIds: string[];
  status: 'auth_required' | 'failed';
}): void => {
  for (const productId of productIds) {
    persistVintedQuickListFeedback(productId, status, {
      ...connection,
      ...(failureReason !== undefined ? { failureReason } : {}),
    });
  }
};

const refreshVintedSession = async ({
  connection,
  productIds,
  toast,
}: VintedSessionPreparationOptions): Promise<boolean> => {
  const manualSessionResponse = await ensureVintedBrowserSession(connection);
  if (manualSessionResponse.savedSession === true) {
    toast('Vinted login session refreshed.', { variant: 'success' });
    return true;
  }

  markProductsForSessionFailure({ connection, productIds, status: 'failed' });
  toast('Vinted login session could not be saved. Complete login verification and retry.', {
    variant: 'error',
  });
  return false;
};

const handleVintedSessionPreparationError = ({
  connection,
  error,
  productIds,
  toast,
}: VintedSessionPreparationOptions & {
  error: unknown;
}): boolean => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Failed to prepare the Vinted session for mass export.';
  const authRequired = isVintedBrowserAuthRequiredMessage(errorMessage);

  markProductsForSessionFailure({
    connection,
    failureReason: authRequired ? null : errorMessage,
    productIds,
    status: authRequired ? 'auth_required' : 'failed',
  });
  logClientCatch(error, {
    source: 'useVintedMassQuickExport',
    action: 'prepareSession',
  });
  toast(errorMessage, { variant: 'error' });
  return false;
};

export const prepareVintedSessionForMassExport = async ({
  connection,
  productIds,
  toast,
}: VintedSessionPreparationOptions): Promise<boolean> => {
  try {
    const preflightResponse = await preflightVintedQuickListSession(connection);
    if (preflightResponse.ready === true) return true;

    return refreshVintedSession({ connection, productIds, toast });
  } catch (error: unknown) {
    return handleVintedSessionPreparationError({
      connection,
      error,
      productIds,
      toast,
    });
  }
};
