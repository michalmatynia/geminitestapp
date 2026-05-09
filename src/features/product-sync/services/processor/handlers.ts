import { randomUUID } from 'crypto';

import {
  getProductSyncProfile,
  getProductSyncRun,
  putProductSyncRunItem,
  touchProductSyncProfileLastRunAt,
  updateProductSyncRun,
  updateProductSyncRunStatus,
} from '@/features/product-sync/services/product-sync-repository';
import type {
  ProductSyncRunItemRecord,
  ProductSyncRunRecord,
  ProductSyncRunStats,
  ProductSyncRunStatus,
} from '@/shared/contracts/product-sync';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  fetchBaseDetailsMap,
  isTerminalRunStatus,
  nowIso,
  resolveBaseConnectionContext,
  resolveBatchProductSyncTargets,
  summarizeRun,
  syncSingleLinkedProduct,
  toTrimmedString,
} from '../product-sync-processor';
import {
  RUN_PROGRESS_FLUSH_EVERY_ITEMS,
  RUN_PROGRESS_FLUSH_EVERY_MS,
} from '../product-sync-processor/constants';
import type {
  BaseConnectionContext,
  ResolvedProductSyncTarget,
} from '../product-sync-processor/types';

export const processProductSyncRun = async (runId: string): Promise<ProductSyncRunRecord> => {
  const run = await getProductSyncRun(runId);
  if (!run) {
    throw new Error(`Product sync run not found: ${runId}`);
  }

  if (isTerminalRunStatus(run.status)) {
    return run;
  }

  const profile = await getProductSyncProfile(run.profileId);
  if (!profile) {
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: 'Sync profile no longer exists.',
      summaryMessage: 'Run failed because the profile was deleted.',
    });
  }

  let connectionContext: BaseConnectionContext;
  try {
    connectionContext = await resolveBaseConnectionContext(profile);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-sync-processor',
      action: 'processProductSyncRun.resolveBaseConnectionContext',
      runId,
      profileId: profile.id,
      connectionId: profile.connectionId,
    });
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Connection resolution failed.',
      summaryMessage: 'Run failed during connection preflight.',
    });
  }

  await updateProductSyncRunStatus(runId, 'running', {
    errorMessage: null,
    summaryMessage: null,
    stats: {
      total: 0,
      processed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      localUpdated: 0,
      baseUpdated: 0,
    },
  });

  const productRepository = await getProductRepository();
  const pageSize = Math.max(1, Math.min(profile.batchSize, 500));
  const stats: ProductSyncRunStats = {
    total: 0,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    localUpdated: 0,
    baseUpdated: 0,
  };

  let page = 1;
  let itemCounter = 0;
  let lastProgressFlushProcessed = 0;
  let lastProgressFlushAtMs = Date.now();

  const flushRunProgress = async (force = false): Promise<void> => {
    const nowMs = Date.now();
    const processedDelta = stats.processed - lastProgressFlushProcessed;
    const dueToProcessedItems = processedDelta >= RUN_PROGRESS_FLUSH_EVERY_ITEMS;
    const dueToHeartbeatAge = nowMs - lastProgressFlushAtMs >= RUN_PROGRESS_FLUSH_EVERY_MS;
    if (!force && !dueToProcessedItems && !dueToHeartbeatAge) return;

    await updateProductSyncRun(runId, {
      stats: { ...stats },
      summaryMessage: summarizeRun(stats),
      errorMessage: null,
    });
    lastProgressFlushProcessed = stats.processed;
    lastProgressFlushAtMs = nowMs;
  };

  try {
    while (true) {
      const products = await productRepository.getProducts({
        page,
        pageSize,
        ...(profile.catalogId ? { catalogId: profile.catalogId } : {}),
      });

      if (products.length === 0) {
        break;
      }

      const resolvedProducts = await resolveBatchProductSyncTargets({
        products,
        connectionId: connectionContext.connectionId,
        token: connectionContext.token,
        inventoryId: connectionContext.inventoryId,
      });

      if (resolvedProducts.length > 0) {
        stats.total += resolvedProducts.length;
        const baseDetailsById = await fetchBaseDetailsMap(
          connectionContext.token,
          connectionContext.inventoryId,
          resolvedProducts
            .map(({ target }: ResolvedProductSyncTarget) => toTrimmedString(target.baseProductId))
            .filter((id: string | null): id is string => typeof id === 'string' && id.length > 0)
        );

        for (const { product, target } of resolvedProducts) {
          const baseProductId = toTrimmedString(target.baseProductId);
          itemCounter += 1;

          try {
            const result = await syncSingleLinkedProduct({
              product,
              baseProductId,
              baseRecord: baseDetailsById.get(baseProductId) ?? null,
              profile,
              integrationId: connectionContext.integrationId,
              connectionId: connectionContext.connectionId,
              inventoryId: connectionContext.inventoryId,
              token: connectionContext.token,
            });

            stats.processed += 1;
            if (result.status === 'success') {
              stats.success += 1;
              if (result.localChanges.length > 0) stats.localUpdated += 1;
              if (result.baseChanges.length > 0) stats.baseUpdated += 1;
            } else if (result.status === 'skipped') {
              stats.skipped += 1;
            } else {
              stats.failed += 1;
            }

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: result.status,
              localChanges: result.localChanges,
              baseChanges: result.baseChanges,
              message: result.message,
              errorMessage: result.errorMessage,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'product-sync-processor',
              action: 'processProductSyncRun.syncSingleLinkedProduct',
              runId,
              profileId: profile.id,
              productId: product.id,
              baseProductId,
            });
            stats.processed += 1;
            stats.failed += 1;

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: 'failed',
              localChanges: [],
              baseChanges: [],
              message: null,
              errorMessage:
                error instanceof Error ? error.message : 'Unexpected synchronization error.',
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          }
        }
      }

      if (products.length < pageSize) {
        break;
      }
      page += 1;
    }

    await flushRunProgress(true);

    const summaryMessage = summarizeRun(stats);
    const finalStatus: ProductSyncRunStatus =
      stats.failed === 0
        ? 'completed'
        : stats.success > 0 || stats.skipped > 0
          ? 'partial_success'
          : 'failed';

    const updatedRun = await updateProductSyncRunStatus(runId, finalStatus, {
      stats,
      summaryMessage,
      errorMessage: finalStatus === 'failed' ? summaryMessage : null,
    });

    await touchProductSyncProfileLastRunAt(profile.id, updatedRun.finishedAt ?? nowIso());

    return updatedRun;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-sync-processor',
      action: 'processProductSyncRun',
      runId,
      profileId: profile.id,
    });

    const failed = await updateProductSyncRunStatus(runId, 'failed', {
      stats,
      summaryMessage: summarizeRun(stats),
      errorMessage: error instanceof Error ? error.message : 'Synchronization failed.',
    });

    await touchProductSyncProfileLastRunAt(profile.id, failed.finishedAt ?? nowIso());

    return failed;
  }
};
