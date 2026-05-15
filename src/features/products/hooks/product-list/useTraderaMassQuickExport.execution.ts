'use client';

import { useCallback, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import { persistTraderaQuickListFeedback } from '@/features/integrations/product-integrations-adapter';
import type { ProgressSnapshotDto } from '@/shared/contracts/base';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { integrationSelectionQueryKeys } from '@/features/integrations/product-integrations-adapter';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ResolvedTraderaQuickExportConnection } from './useTraderaMassQuickExport.connection';

type ToastFn = ReturnType<typeof useToast>['toast'];

type UseTraderaMassQuickExportExecutorOptions = {
  queryClient: QueryClient;
  resolveConnection: () => Promise<ResolvedTraderaQuickExportConnection | null>;
  toast: ToastFn;
};

type ProductExportContext = {
  connection: ResolvedTraderaQuickExportConnection;
  queryClient: QueryClient;
};

type SequentialExportContext = ProductExportContext & {
  productIds: string[];
  setProgress: (progress: ProgressSnapshotDto) => void;
  toast: ToastFn;
};

type SequentialExportState = {
  errorCount: number;
};

const normalizeResponseId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const exportProductToTradera = async ({
  connection,
  productId,
  queryClient,
}: ProductExportContext & {
  productId: string;
}): Promise<boolean> => {
  try {
    persistTraderaQuickListFeedback(productId, 'processing', connection);
    const response = await api.post<{
      id?: string;
      queue?: { jobId?: string; name?: string };
    }>(`/api/v2/integrations/products/${productId}/listings`, connection);
    const listingId = normalizeResponseId(response.id);
    const jobId = normalizeResponseId(response.queue?.jobId);

    persistTraderaQuickListFeedback(productId, 'queued', {
      ...connection,
      listingId,
      requestId: jobId,
    });
    void invalidateProductListingsAndBadges(queryClient, productId);
    return true;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useTraderaMassQuickExport',
      action: 'exportProduct',
      productId,
    });
    persistTraderaQuickListFeedback(productId, 'failed', connection);
    return false;
  }
};

const shouldShowProgressToast = (processedCount: number, total: number): boolean =>
  processedCount % 5 === 0 || processedCount === total;

const buildProgressToastMessage = ({
  errorCount,
  processedCount,
  total,
}: {
  errorCount: number;
  processedCount: number;
  total: number;
}): string => {
  const failureSuffix = errorCount > 0 ? ` (${errorCount} failed)` : '';
  return `Exporting ${processedCount}/${total} to Tradera...${failureSuffix}`;
};

const runSequentialExportStep = async (
  previousState: SequentialExportState,
  productId: string,
  index: number,
  context: SequentialExportContext
): Promise<SequentialExportState> => {
  const queued = await exportProductToTradera({
    connection: context.connection,
    productId,
    queryClient: context.queryClient,
  });
  const errorCount = queued ? previousState.errorCount : previousState.errorCount + 1;
  const processedCount = index + 1;
  const total = context.productIds.length;

  context.setProgress({ current: processedCount, total, errors: errorCount });
  if (shouldShowProgressToast(processedCount, total)) {
    context.toast(buildProgressToastMessage({ errorCount, processedCount, total }), {
      variant: 'info',
    });
  }

  return { errorCount };
};

const runProductsSequentially = (
  context: SequentialExportContext
): Promise<SequentialExportState> =>
  context.productIds.reduce<Promise<SequentialExportState>>(
    async (previousStatePromise, productId, index) =>
      runSequentialExportStep(await previousStatePromise, productId, index, context),
    Promise.resolve({ errorCount: 0 })
  );

const persistPreferredConnection = async (
  queryClient: QueryClient,
  connection: ResolvedTraderaQuickExportConnection
): Promise<void> => {
  try {
    await api.post('/api/v2/integrations/exports/tradera/default-connection', {
      connectionId: connection.connectionId,
    });
    queryClient.setQueryData(
      normalizeQueryKey(integrationSelectionQueryKeys.traderaDefaultConnection),
      { connectionId: connection.connectionId }
    );
  } catch {
    // Best-effort persistence.
  }
};

const resolveConnectionForExecution = async ({
  resolveConnection,
  toast,
}: Pick<
  UseTraderaMassQuickExportExecutorOptions,
  'resolveConnection' | 'toast'
>): Promise<ResolvedTraderaQuickExportConnection | null> => {
  try {
    const resolved = await resolveConnection();
    if (resolved !== null) return resolved;
    toast('No Tradera browser connection configured. Add a Tradera browser connection first.', {
      variant: 'error',
    });
    return null;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'useTraderaMassQuickExport',
      action: 'resolveConnection',
    });
    toast('Failed to resolve Tradera connection for mass export.', { variant: 'error' });
    return null;
  }
};

const buildFinalToast = ({
  errorCount,
  total,
}: {
  errorCount: number;
  total: number;
}): { message: string; variant: 'error' | 'success' } => {
  const successCount = total - errorCount;
  if (errorCount > 0) {
    return {
      message: `Tradera mass export done: ${successCount}/${total} queued, ${errorCount} failed.`,
      variant: 'error',
    };
  }

  return {
    message: `Tradera mass export done: ${successCount} products queued.`,
    variant: 'success',
  };
};

export const useTraderaMassQuickExportExecutor = ({
  queryClient,
  resolveConnection,
  toast,
}: UseTraderaMassQuickExportExecutorOptions): {
  execute: (productIds: string[]) => Promise<void>;
  isRunning: boolean;
  progress: ProgressSnapshotDto;
} => {
  const [progress, setProgress] = useState<ProgressSnapshotDto>({
    current: 0,
    total: 0,
    errors: 0,
  });
  const massExportMutation = useMutationV2<void, string[]>({
    mutationKey: ['products', 'mass-quick-export', 'tradera'],
    mutationFn: async (productIds: string[]): Promise<void> => {
      if (productIds.length === 0) return;
      setProgress({ current: 0, total: productIds.length, errors: 0 });

      const connection = await resolveConnectionForExecution({ resolveConnection, toast });
      if (connection === null) return;

      const { errorCount } = await runProductsSequentially({
        connection,
        productIds,
        queryClient,
        setProgress,
        toast,
      });
      await persistPreferredConnection(queryClient, connection);
      const finalToast = buildFinalToast({ errorCount, total: productIds.length });
      toast(finalToast.message, { variant: finalToast.variant });
    },
    meta: {
      source: 'products.hooks.useTraderaMassQuickExport.execute',
      operation: 'action',
      resource: 'products.mass-quick-export.tradera',
      domain: 'products',
      description: 'Runs mass Tradera quick export for selected products.',
      errorPresentation: 'toast',
      tags: ['products', 'tradera', 'mass-quick-export'],
    },
  });

  const execute = useCallback(async (productIds: string[]): Promise<void> => {
    if (massExportMutation.isPending || productIds.length === 0) return;
    await massExportMutation.mutateAsync(productIds);
  }, [massExportMutation]);

  return { execute, isRunning: massExportMutation.isPending, progress };
};
