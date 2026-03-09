import { NextRequest, NextResponse } from 'next/server';

import {
  checkBaseSkuExists,
  getExportWarehouseId,
  LogCapture,
} from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ProductListingExportEvent } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

import {
  BASE_EXPORT_SOURCE,
  clearExpiredExportRequestLocks,
  inFlightExportRequests,
  exportSchema,
  type BaseExportRequestData,
} from './helpers';
import {
  isBaseImageError,
  buildImageDiagnosticsLogger,
  logImageDiagnostics,
  prepareBaseExportMappingsAndProduct,
  resolveWarehouseAndStockMappings,
  loadExportResources,
  createExportRun,
  updateRunStarted,
  resolveListingForExport,
  executeBaseExport,
  verifySkuUniqueness,
} from './segments';

/**
 * POST /api/v2/integrations/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
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
  let runMeta: Record<string, unknown> = {
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
        const logs = logCapture.getLogs();
        return NextResponse.json({
          success: true,
          message: 'Export already in progress',
          idempotent: true,
          inProgress: true,
          runId: null,
          logs,
        });
      }
      inFlightExportRequests.set(lockKey, Date.now());
      requestLockKey = lockKey;
    }

    const { product, connection, integrations, session, primaryListingRepo } =
      await loadExportResources(productId, data.connectionId);

    if (!product) {
      throw externalServiceError('Product not found', { productId });
    }
    if (!connection) {
      throw externalServiceError('Connection not found', { connectionId: data.connectionId });
    }

    const userId = session?.user?.id ?? null;

    const { run, runRepository } = await createExportRun({
      userId,
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      imagesOnly,
      templateId: data.templateId ?? null,
      runMeta,
    });
    runId = run.id;

    void updateRunStarted(runRepository, runId, {
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      imagesOnly,
    });

    const preparedProduct: ProductWithImages = {
      ...product,
      categoryId: product.categoryId ?? null,
    };

    const preparedExportContext = await prepareBaseExportMappingsAndProduct<ProductWithImages>({
      data,
      imagesOnly,
      productId,
      resolvedInventoryId,
      product: preparedProduct,
    });

    const { mappings, resolvedTemplateId, requestedTemplateId, exportProduct } =
      preparedExportContext;
    let { exportImagesAsBase64, imageBase64Mode, imageTransform } = preparedExportContext;
    const {
      producerNameById,
      producerExternalIdByInternalId,
      tagNameById,
      tagExternalIdByInternalId,
    } = preparedExportContext;

    const baseIntegration = integrations.find((integration) =>
      ['baselinker', 'base-com', 'base'].includes(integration.slug)
    );
    const baseIntegrationId = baseIntegration?.id ?? connection.integrationId ?? null;
    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error ??
          'No Base API token configured. Please test or re-save the connection.',
        { connectionId: data.connectionId }
      );
    }
    const token = tokenResolution.token;

    const { listingRepo, listingId, listingExternalId, listingInventoryId } =
      await resolveListingForExport({
        productId,
        connectionId: data.connectionId,
        inventoryId: resolvedInventoryId,
        imagesOnly,
        externalListingId: data.externalListingId ?? null,
        listingIdFromData: data.listingId ?? null,
        baseIntegrationId,
        primaryListingRepo,
      });

    if (requestId && listingId) {
      const existingListing = await listingRepo.getListingById(listingId);
      const history = existingListing?.exportHistory ?? [];
      const prior = history.find(
        (event: ProductListingExportEvent) =>
          event.requestId === requestId && event.status === 'success'
      );
      if (prior) {
        if (runId) {
          await runRepository
            .createRunEvent({
              runId,
              level: 'info',
              message: 'Export already completed (idempotent).',
              metadata: {
                productId,
                listingId,
                externalListingId:
                  prior.externalListingId ?? existingListing?.externalListingId ?? null,
                requestId,
                idempotent: true,
              },
            })
            .catch(() => undefined);
          await runRepository
            .updateRun(runId, {
              status: 'completed',
              finishedAt: new Date().toISOString(),
              meta: { ...runMeta, idempotent: true, completedAt: new Date().toISOString() },
            })
            .catch(() => undefined);
        }
        logCapture.stop();
        return NextResponse.json({
          success: true,
          message: 'Export already completed',
          externalProductId: prior.externalListingId ?? existingListing?.externalListingId ?? null,
          idempotent: true,
          runId,
          logs: logCapture.getLogs(),
        });
      }
    }

    await verifySkuUniqueness({
      allowDuplicateSku: imagesOnly ? true : (data.allowDuplicateSku ?? false),
      listingExternalId,
      sku: product.sku,
      token,
      inventoryId: resolvedInventoryId,
    });

    const targetInventoryId =
      imagesOnly && listingInventoryId ? listingInventoryId : resolvedInventoryId;
    const canRetryWrite = imagesOnly || Boolean(listingExternalId);

    let warehouseId = imagesOnly ? null : await getExportWarehouseId(targetInventoryId);
    const warehouseResolution = await resolveWarehouseAndStockMappings({
      imagesOnly,
      token,
      targetInventoryId,
      initialWarehouseId: warehouseId,
      mappings,
      productId,
    });
    warehouseId = warehouseResolution.warehouseId;

    const baseImageDiagnostics = exportImagesAsBase64
      ? buildImageDiagnosticsLogger({
        productId,
        connectionId: data.connectionId,
        inventoryId: targetInventoryId,
        exportImagesAsBase64,
        imageBase64Mode,
        imageTransform,
      })
      : undefined;

    const exportExec = await executeBaseExport({
      imagesOnly,
      token,
      targetInventoryId,
      exportProduct,
      effectiveMappings: warehouseResolution.effectiveMappings,
      warehouseId,
      listingExternalId,
      imageBaseUrl,
      stockWarehouseAliases: warehouseResolution.stockWarehouseAliases ?? undefined,
      producerNameById: producerNameById ?? undefined,
      producerExternalIdByInternalId: producerExternalIdByInternalId ?? undefined,
      tagNameById: tagNameById ?? undefined,
      tagExternalIdByInternalId: tagExternalIdByInternalId ?? undefined,
      exportImagesAsBase64,
      imageBase64Mode,
      imageTransform,
      baseImageDiagnostics,
      product,
      canRetryWrite,
    });

    let { result, exportFields } = exportExec;
    warehouseId = exportExec.finalWarehouseId;
    let effectiveMappings = exportExec.finalMappings;

    if (!result.success && isBaseImageError(result.error)) {
      await logImageDiagnostics({
        product,
        imageBaseUrl,
        includeBase64: exportImagesAsBase64,
        base64Mode: imageBase64Mode,
        transform: imageTransform,
        context: {
          productId,
          connectionId: data.connectionId,
          inventoryId: targetInventoryId,
          exportImagesAsBase64,
          imageBase64Mode,
        },
      });

      if (!exportImagesAsBase64 || !imageTransform) {
        const retryImagesAsBase64 = true;
        const retryImageBase64Mode = 'base-only';
        const retryImageTransform = { forceJpeg: true, maxDimension: 1600, jpegQuality: 85 };
        const imageDiagnostics = buildImageDiagnosticsLogger({
          productId,
          connectionId: data.connectionId,
          inventoryId: targetInventoryId,
          exportImagesAsBase64: retryImagesAsBase64,
          imageBase64Mode: retryImageBase64Mode,
          imageTransform: retryImageTransform,
        });

        const retryExec = await executeBaseExport({
          imagesOnly,
          token,
          targetInventoryId,
          exportProduct,
          effectiveMappings,
          warehouseId,
          listingExternalId,
          imageBaseUrl,
          stockWarehouseAliases: warehouseResolution.stockWarehouseAliases ?? undefined,
          producerNameById: producerNameById ?? undefined,
          producerExternalIdByInternalId: producerExternalIdByInternalId ?? undefined,
          tagNameById: tagNameById ?? undefined,
          tagExternalIdByInternalId: tagExternalIdByInternalId ?? undefined,
          exportImagesAsBase64: retryImagesAsBase64,
          imageBase64Mode: retryImageBase64Mode,
          imageTransform: retryImageTransform,
          baseImageDiagnostics: imageDiagnostics,
          product,
          canRetryWrite,
        });
        result = retryExec.result;
        exportFields = retryExec.exportFields;
      }
    }

    if (!result.success && !imagesOnly && !canRetryWrite && product.sku) {
      const createdAfterTimeout = await checkBaseSkuExists(token, targetInventoryId, product.sku);
      if (createdAfterTimeout.exists) {
        result = { success: true, productId: createdAfterTimeout.productId };
      }
    }

    if (!result.success) {
      if (listingId) {
        await listingRepo.updateListingStatus(listingId, 'failed');
        await listingRepo.appendExportHistory(listingId, {
          exportedAt: new Date().toISOString(),
          status: 'failed',
          inventoryId: targetInventoryId,
          templateId: resolvedTemplateId ?? (requestedTemplateId || null),
          warehouseId,
          externalListingId: result.productId || null,
          fields: exportFields,
          requestId: requestId ?? null,
        });
      }
      throw externalServiceError(result.error || 'Failed to export product', {
        productId,
        inventoryId: targetInventoryId,
      });
    }

    if (listingId) {
      if (result.productId) await listingRepo.updateListingExternalId(listingId, result.productId);
      await listingRepo.updateListingStatus(listingId, 'active');
      await listingRepo.appendExportHistory(listingId, {
        exportedAt: new Date().toISOString(),
        status: 'success',
        inventoryId: targetInventoryId,
        templateId: resolvedTemplateId ?? (requestedTemplateId || null),
        warehouseId,
        externalListingId: result.productId || null,
        fields: exportFields,
        requestId: requestId ?? null,
      });
    }

    logCapture.stop();
    const logs = logCapture.getLogs();
    if (runId) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'info',
          message: 'Export to Base.com completed.',
          metadata: {
            productId,
            inventoryId: targetInventoryId,
            listingId,
            externalProductId: result.productId ?? null,
            imagesOnly,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'completed',
          finishedAt: new Date().toISOString(),
          meta: {
            ...runMeta,
            listingId,
            inventoryId: targetInventoryId,
            externalProductId: result.productId ?? null,
            completedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      message: 'Product successfully exported to Base.com',
      externalProductId: result.productId,
      runId,
      logs,
    });
  } catch (error) {
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
