'use client';

import { useCallback, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  clearPersistedVintedQuickListFeedback,
  integrationSelectionQueryKeys,
  isVintedBrowserAuthRequiredMessage,
  persistVintedQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { ProgressSnapshotDto } from '@/shared/contracts/base';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ResolvedVintedQuickExportConnection } from './useVintedMassQuickExport.connection';
import { prepareVintedSessionForMassExport } from './useVintedMassQuickExport.session';

type ToastFn = ReturnType<typeof useToast>['toast'];

type UseVintedMassQuickExportExecutorOptions = {
  queryClient: QueryClient;
  resolveConnection: () => Promise<ResolvedVintedQuickExportConnection | null>;
  toast: ToastFn;
};

type ProductExportContext = {
  connection: ResolvedVintedQuickExportConnection;
  queryClient: QueryClient;
};

type SequentialExportContext = ProductExportContext & {
  productIds: string[];
  setProgress: (progress: ProgressSnapshotDto) => void;
  toast: ToastFn;
};

type SequentialExportState = {
  alreadyListedCount: number;
  errorCount: number;
};

const normalizeResponseId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isAlreadyListedError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 409 &&
  !isVintedBrowserAuthRequiredMessage(error.message);

const handleVintedProductExportError = ({
  connection,
  error,
  productId,
  queryClient,
}: ProductExportContext & {
  error: unknown;
  productId: string;
}): 'already_listed' | 'failed' => {
  if (isAlreadyListedError(error)) {
    clearPersistedVintedQuickListFeedback(productId);
    void invalidateProductListingsAndBadges(queryClient, productId);
    return 'already_listed';
  }

  const errorMessage = error instanceof Error ? error.message : 'Failed to queue Vinted listing.';
  const authRequired = isVintedBrowserAuthRequiredMessage(errorMessage);
  persistVintedQuickListFeedback(productId, authRequired ? 'auth_required' : 'failed', {
    ...connection,
    failureReason: authRequired ? null : errorMessage,
  });
  logClientCatch(error, {
    source: 'useVintedMassQuickExport',
    action: 'exportProduct',
    productId,
  });
  return 'failed';
};

const exportProductToVinted = async ({
  connection,
  productId,
  queryClient,
}: ProductExportContext & {
  productId: string;
}): Promise<'already_listed' | 'failed' | 'queued'> => {
  try {
    persistVintedQuickListFeedback(productId, 'processing', connection);
    const response = await api.post<{
      id?: string;
      queue?: { jobId?: string; name?: string };
    }>(`/api/v2/integrations/products/${productId}/listings`, connection);

    persistVintedQuickListFeedback(productId, 'queued', {
      ...connection,
      listingId: normalizeResponseId(response.id),
      requestId: normalizeResponseId(response.queue?.jobId),
    });
    void invalidateProductListingsAndBadges(queryClient, productId);
    return 'queued';
  } catch (error: unknown) {
    return handleVintedProductExportError({ connection, error, productId, queryClient });
  }
};

const shouldShowProgressToast = (processedCount: number, total: number): boolean =>
  processedCount % 5 === 0 || processedCount === total;

const buildProgressDetails = ({
  alreadyListedCount,
  errorCount,
}: SequentialExportState): string => {
  const progressDetails = [
    errorCount > 0 ? `${errorCount} failed` : null,
    alreadyListedCount > 0 ? `${alreadyListedCount} already listed` : null,
  ].filter((value): value is string => value !== null);

  return progressDetails.length > 0 ? ` (${progressDetails.join(', ')})` : '';
};

const runSequentialExportStep = async (
  previousState: SequentialExportState,
  productId: string,
  index: number,
  context: SequentialExportContext
): Promise<SequentialExportState> => {
  const result = await exportProductToVinted({
    connection: context.connection,
    productId,
    queryClient: context.queryClient,
  });
  const nextState = {
    alreadyListedCount:
      previousState.alreadyListedCount + (result === 'already_listed' ? 1 : 0),
    errorCount: previousState.errorCount + (result === 'failed' ? 1 : 0),
  };
  const processedCount = index + 1;
  const total = context.productIds.length;

  context.setProgress({ current: processedCount, total, errors: nextState.errorCount });
  if (shouldShowProgressToast(processedCount, total)) {
    context.toast(
      `Exporting ${processedCount}/${total} to Vinted...${buildProgressDetails(nextState)}`,
      { variant: 'info' }
    );
  }

  return nextState;
};

const runProductsSequentially = (
  context: SequentialExportContext
): Promise<SequentialExportState> =>
  context.productIds.reduce<Promise<SequentialExportState>>(
    async (previousStatePromise, productId, index) =>
      runSequentialExportStep(await previousStatePromise, productId, index, context),
    Promise.resolve({ alreadyListedCount: 0, errorCount: 0 })
  );

const persistPreferredConnection = async (
  queryClient: QueryClient,
  connection: ResolvedVintedQuickExportConnection
): Promise<void> => {
  try {
    await api.post('/api/v2/integrations/exports/vinted/default-connection', {
      connectionId: connection.connectionId,
    });
    queryClient.setQueryData(
      normalizeQueryKey(integrationSelectionQueryKeys.vintedDefaultConnection),
      { connectionId: connection.connectionId }
    );
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useVintedMassQuickExport',
      action: 'persistPreferredConnection',
      connectionId: connection.connectionId,
      level: 'warn',
    });
  }
};

const resolveConnectionForExecution = async ({
  resolveConnection,
  toast,
}: Pick<
  UseVintedMassQuickExportExecutorOptions,
  'resolveConnection' | 'toast'
>): Promise<ResolvedVintedQuickExportConnection | null> => {
  try {
    const resolved = await resolveConnection();
    if (resolved !== null) return resolved;
    toast('No Vinted connection configured. Add a Vinted connection first.', {
      variant: 'error',
    });
    return null;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useVintedMassQuickExport',
      action: 'resolveConnection',
    });
    toast('Failed to resolve Vinted connection for mass export.', { variant: 'error' });
    return null;
  }
};

const resolveFinalToastVariant = ({
  alreadyListedCount,
  errorCount,
}: SequentialExportState): 'error' | 'info' | 'success' => {
  if (errorCount > 0) return 'error';
  if (alreadyListedCount > 0) return 'info';
  return 'success';
};

const buildFinalToast = ({
  alreadyListedCount,
  errorCount,
  total,
}: SequentialExportState & {
  total: number;
}): { message: string; variant: 'error' | 'info' | 'success' } => {
  const successCount = total - errorCount - alreadyListedCount;
  const summaryParts = [`${successCount}/${total} queued`];
  if (alreadyListedCount > 0) summaryParts.push(`${alreadyListedCount} already listed`);
  if (errorCount > 0) summaryParts.push(`${errorCount} failed`);

  return {
    message: `Vinted mass export done: ${summaryParts.join(', ')}.`,
    variant: resolveFinalToastVariant({ alreadyListedCount, errorCount }),
  };
};

export const useVintedMassQuickExportExecutor = ({
  queryClient,
  resolveConnection,
  toast,
}: UseVintedMassQuickExportExecutorOptions): {
  execute: (productIds: string[]) => Promise<void>;
  isRunning: boolean;
  progress: ProgressSnapshotDto;
} => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressSnapshotDto>({
    current: 0,
    total: 0,
    errors: 0,
  });

  const execute = useCallback(async (productIds: string[]): Promise<void> => {
    if (isRunning || productIds.length === 0) return;

    setIsRunning(true);
    setProgress({ current: 0, total: productIds.length, errors: 0 });

    try {
      const connection = await resolveConnectionForExecution({ resolveConnection, toast });
      if (connection === null) return;
      const sessionReady = await prepareVintedSessionForMassExport({
        connection,
        productIds,
        toast,
      });
      if (!sessionReady) return;

      const exportState = await runProductsSequentially({
        connection,
        productIds,
        queryClient,
        setProgress,
        toast,
      });
      await persistPreferredConnection(queryClient, connection);
      await invalidateProducts(queryClient);
      const finalToast = buildFinalToast({ ...exportState, total: productIds.length });
      toast(finalToast.message, { variant: finalToast.variant });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, queryClient, resolveConnection, toast]);

  return { execute, isRunning, progress };
};
