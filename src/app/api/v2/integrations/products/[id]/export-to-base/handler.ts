import { NextRequest, NextResponse } from 'next/server';

import {
  LogCapture,
} from '@/features/integrations/server';
import { recoverStaleBaseExportRuns } from '@/features/integrations/services/base-export-run-recovery';
import { enqueueBaseExportJob } from '@/features/integrations/workers/baseExportQueue';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  badRequestError,
  externalServiceError,
  serviceUnavailableError,
} from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';
import { initializeQueues } from '@/features/jobs/server';

import {
  BASE_EXPORT_SOURCE,
  clearExpiredExportRequestLocks,
  inFlightExportRequests,
  exportSchema,
  type BaseExportRequestData,
} from './helpers';
import {
  loadExportResources,
  createExportRun,
} from './segments';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


/**
 * POST /api/v2/integrations/products/[id]/export-to-base
 *
 * Validates the export request, creates a tracking run, and enqueues
 * a BullMQ job for background processing.  All heavy work (template
 * resolution, SKU checks, warehouse mapping, Base.com API calls) is
 * handled by the processor.
 */
export async function postExportToBaseHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const logCapture = new LogCapture();
  logCapture.start();
  let runId: string | null = null;
  let requestLockKey: string | null = null;
  const runMeta: Record<string, unknown> = {
    source: BASE_EXPORT_SOURCE,
    sourceInfo: {
      tab: 'products',
      location: 'product-listing',
      action: 'export_to_base',
    },
    executionMode: 'server',
    runMode: 'api',
    integration: 'base.com',
  };

  try {
    const { id: productId } = params;
    const parsed = await parseJsonBody(_req, exportSchema, {
      logPrefix: 'export-to-base',
    });
    if (!parsed.ok) {
      logCapture.stop();
      return parsed.response;
    }
    const data: BaseExportRequestData = parsed.data;
    const requestId =
      _req.headers.get('idempotency-key') ??
      _req.headers.get('x-idempotency-key') ??
      _req.headers.get('x-request-id') ??
      undefined;
    const imagesOnly = data.imagesOnly ?? false;
    const forwardedHost = _req.headers.get('x-forwarded-host') ?? _req.headers.get('host');
    const forwardedProto = _req.headers.get('x-forwarded-proto') ?? 'http';
    const imageBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(_req.url).origin;
    const resolvedInventoryId = data.inventoryId?.trim() ?? '';
    if (!resolvedInventoryId) {
      throw badRequestError(
        'Inventory ID is required for Base.com export. Default inventory fallback is disabled.'
      );
    }

    initializeQueues();

    if (isRedisAvailable() && !(await isRedisReachable())) {
      throw serviceUnavailableError(
        'Base.com export queue is unavailable because Redis is unreachable. Start Redis and retry.',
        5000,
        {
          queue: 'base-export',
          source: BASE_EXPORT_SOURCE,
        }
      );
    }

    // ── Idempotency dedup ──
    const normalizedRequestId = requestId?.trim() ?? '';
    if (normalizedRequestId) {
      clearExpiredExportRequestLocks();
      const lockKey = [
        productId,
        data.connectionId,
        resolvedInventoryId,
        imagesOnly ? 'images' : 'full',
        normalizedRequestId,
      ].join(':');
      if (inFlightExportRequests.has(lockKey)) {
        logCapture.stop();
        return NextResponse.json({
          success: true,
          message: 'Export already in progress',
          idempotent: true,
          inProgress: true,
          runId: null,
          logs: logCapture.getLogs(),
        });
      }
      inFlightExportRequests.set(lockKey, Date.now());
      requestLockKey = lockKey;
    }

    // ── Quick existence check ──
    const { product, connection, session } =
      await loadExportResources(productId, data.connectionId);

    if (!product) {
      throw externalServiceError('Product not found', { productId });
    }
    if (!connection) {
      throw externalServiceError('Connection not found', { connectionId: data.connectionId });
    }

    const userId = session?.user?.id ?? null;

    await recoverStaleBaseExportRuns({
      userId: userId ?? undefined,
      productId,
      connectionId: data.connectionId,
    });

    // ── Create tracking run ──
    const { run } = await createExportRun({
      userId,
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      imagesOnly,
      templateId: data.templateId ?? null,
      runMeta,
    });
    runId = run.id;

    // ── Enqueue for background processing ──
    const jobId = await enqueueBaseExportJob({
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      templateId: data.templateId ?? null,
      imagesOnly,
      listingId: data.listingId ?? null,
      externalListingId: data.externalListingId ?? null,
      allowDuplicateSku: data.allowDuplicateSku ?? false,
      exportImagesAsBase64: data.exportImagesAsBase64 ?? null,
      imageBase64Mode: data.imageBase64Mode ?? null,
      imageTransform: data.imageTransform ?? null,
      imageBaseUrl,
      requestId: requestId ?? null,
      runId,
      userId,
    });

    logCapture.stop();
    return NextResponse.json({
      success: true,
      message: 'Export queued for processing',
      status: 'queued' as const,
      runId,
      jobId,
      logs: logCapture.getLogs(),
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    logCapture.stop();
    const logs = logCapture.getLogs();
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to export product to Base.com.';
    if (runId) {
      const runRepository = await getPathRunRepository();
      await runRepository
        .createRunEvent({
          runId,
          level: 'error',
          message: `Export failed: ${errorMessage}`,
          metadata: { logsCount: logs.length },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          errorMessage,
          meta: { ...runMeta, failedAt: new Date().toISOString(), logsCount: logs.length },
        })
        .catch(() => undefined);
    }
    if (error instanceof Error && 'meta' in error) {
      const errorWithMeta = error as Error & { meta?: Record<string, unknown> };
      errorWithMeta.meta = { ...(errorWithMeta.meta ?? {}), logs };
    }
    throw error;
  } finally {
    if (requestLockKey) inFlightExportRequests.delete(requestLockKey);
  }
}
