import 'server-only';

import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { BaseExportJobData } from './baseExportQueue';
import {
  applyExistingSkuFallback,
  buildBaseExportArgs,
  clearListingFailureReason,
  executeWithImageRetry,
  loadValidatedResources,
  prepareExportContext,
  resolveListing,
  resolveTargetInventoryId,
  resolveToken,
  resolveWarehouse,
  verifySku,
} from './baseExportProcessorExecution';
import {
  completeRun,
  persistFailureAndThrow,
  persistSuccessfulExport,
} from './baseExportProcessorPersistence';

const BASE_EXPORT_SOURCE = 'base-export-queue';

type RunRepository = Awaited<ReturnType<typeof getPathRunRepository>>;

const buildRunMeta = (jobId: string): Record<string, unknown> => ({
  source: BASE_EXPORT_SOURCE,
  jobId,
});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Failed to export product to Base.com.';
};

const handleJobFailure = async (
  runId: string,
  runMeta: Record<string, unknown>,
  error: unknown,
  jobId: string
): Promise<void> => {
  const runRepository = await getPathRunRepository();
  const errorMessage = getErrorMessage(error);
  const failedAt = new Date().toISOString();

  void ErrorSystem.captureException(error);
  await runRepository
    .createRunEvent({
      runId,
      level: 'error',
      message: `Export failed: ${errorMessage}`,
      metadata: { jobId },
    })
    .catch(() => undefined);
  await runRepository
    .updateRun(runId, {
      status: 'failed',
      finishedAt: failedAt,
      errorMessage,
      meta: { ...runMeta, failedAt },
    })
    .catch(() => undefined);
  throw error;
};

const markRunRunning = async (
  runRepository: RunRepository,
  data: BaseExportJobData,
  jobId: string
): Promise<void> => {
  const startedRun = await runRepository
    .updateRunIfStatus(data.runId, ['queued'], {
      status: 'running',
      startedAt: new Date().toISOString(),
      meta: { ...buildRunMeta(jobId), productId: data.productId },
    })
    .catch(() => null);

  if (startedRun === null) return;

  await runRepository
    .createRunEvent({
      runId: data.runId,
      level: 'info',
      message: 'Export to Base.com started.',
      metadata: {
        productId: data.productId,
        connectionId: data.connectionId,
        inventoryId: data.inventoryId,
        requestId: data.requestId,
        jobId,
      },
    })
    .catch(() => undefined);
};

export async function processBaseExportJob(
  data: BaseExportJobData,
  jobId: string
): Promise<void> {
  const runRepository = await getPathRunRepository();
  const runMeta = buildRunMeta(jobId);

  try {
    await markRunRunning(runRepository, data, jobId);

    const resources = await loadValidatedResources(data);
    const preparedContext = await prepareExportContext(data, resources.product);
    const token = resolveToken(resources.connection, data.connectionId);
    const listing = await resolveListing(data, resources);
    await clearListingFailureReason(listing);

    const targetInventoryId = resolveTargetInventoryId(data, listing);
    const warehouse = await resolveWarehouse(data, token, targetInventoryId, preparedContext);
    await verifySku(data, token, listing, resources.product);

    const baseExportArgs = buildBaseExportArgs({
      data,
      token,
      targetInventoryId,
      preparedContext,
      warehouse,
      listing,
      product: resources.product,
    });
    const retriedExecution = await executeWithImageRetry(data, targetInventoryId, baseExportArgs);
    const execution = await applyExistingSkuFallback({
      execution: retriedExecution,
      data,
      token,
      targetInventoryId,
      product: resources.product,
    });

    if (!execution.result.success) {
      await persistFailureAndThrow({ execution, data, listing, targetInventoryId, warehouse });
    }

    await persistSuccessfulExport({
      execution,
      data,
      resources,
      listing,
      targetInventoryId,
      warehouse,
    });
    await completeRun(runRepository, data.runId);
  } catch (error) {
    await handleJobFailure(data.runId, runMeta, error, jobId);
  }
}
