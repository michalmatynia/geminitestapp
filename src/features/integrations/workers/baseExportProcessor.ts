import 'server-only';

import {
  checkBaseSkuExists,
  getExportWarehouseId,
} from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { BaseExportJobData } from './baseExportQueue';

async function loadSegments() {
  // Dynamic import to avoid circular dependency issues with the API route tree
  const segments = await import('@/features/integrations/services/base-export-segments');
  return segments;
}

const BASE_EXPORT_SOURCE = 'base-export-queue';

export async function processBaseExportJob(
  data: BaseExportJobData,
  jobId: string
): Promise<void> {
  const {
    productId,
    connectionId,
    inventoryId,
    templateId,
    imagesOnly,
    listingId: dataListingId,
    externalListingId: dataExternalListingId,
    allowDuplicateSku,
    exportImagesAsBase64,
    imageBase64Mode,
    imageTransform,
    imageBaseUrl,
    requestId,
    runId,
  } = data;

  const runRepository = await getPathRunRepository();
  const runMeta: Record<string, unknown> = {
    source: BASE_EXPORT_SOURCE,
    sourceInfo: { tab: 'products', location: 'product-listing', action: 'export_to_base' },
    executionMode: 'background',
    runMode: 'queue',
    integration: 'base.com',
    jobId,
  };

  try {
    const startedAt = new Date().toISOString();
    const startedRun = await runRepository
      .updateRunIfStatus(runId, ['queued'], {
        status: 'running',
        startedAt,
        meta: {
          ...runMeta,
          productId,
          connectionId,
          inventoryId,
          requestId,
          startedAt,
        },
      })
      .catch(() => null);

    if (startedRun) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'info',
          message: 'Export to Base.com started.',
          metadata: {
            productId,
            connectionId,
            inventoryId,
            imagesOnly,
            requestId,
            jobId,
          },
        })
        .catch(() => undefined);
    }

    const segments = await loadSegments();
    const requestImageTransform = imageTransform
      ? {
          forceJpeg: imageTransform.forceJpeg,
          maxDimension: imageTransform.maxDimension,
          jpegQuality: imageTransform.jpegQuality,
        }
      : undefined;

    const { product, connection, integrations, primaryListingRepo, productRepo } =
      await segments.loadExportResources(productId, connectionId);

    if (!product) throw externalServiceError('Product not found', { productId });
    if (!connection) throw externalServiceError('Connection not found', { connectionId });

    const preparedProduct: ProductWithImages = {
      ...product,
      categoryId: product.categoryId ?? null,
    };

    const preparedExportContext = await segments.prepareBaseExportMappingsAndProduct<ProductWithImages>({
      data: {
        connectionId,
        inventoryId,
        templateId: templateId ?? undefined,
        imagesOnly,
        listingId: dataListingId ?? undefined,
        externalListingId: dataExternalListingId ?? undefined,
        allowDuplicateSku,
        exportImagesAsBase64: exportImagesAsBase64 ?? undefined,
        imageBase64Mode: imageBase64Mode ?? undefined,
        imageTransform: requestImageTransform,
      },
      imagesOnly,
      productId,
      resolvedInventoryId: inventoryId,
      product: preparedProduct,
    });

    const { mappings, resolvedTemplateId, requestedTemplateId, exportProduct } =
      preparedExportContext;
    let { exportImagesAsBase64: resolvedExportImagesAsBase64, imageBase64Mode: resolvedImageBase64Mode, imageTransform: resolvedImageTransform } =
      preparedExportContext;
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
        { connectionId }
      );
    }
    const token = tokenResolution.token;

    const { listingRepo, listingId, listingExternalId, listingInventoryId } =
      await segments.resolveListingForExport({
        productId,
        connectionId,
        inventoryId,
        imagesOnly,
        externalListingId: dataExternalListingId,
        listingIdFromData: dataListingId,
        baseIntegrationId,
        primaryListingRepo,
      });

    const targetInventoryId =
      imagesOnly && listingInventoryId ? listingInventoryId : inventoryId;
    const canRetryWrite = imagesOnly || Boolean(listingExternalId);

    // Run SKU check and warehouse resolution in parallel
    const [, warehouseResolution] = await Promise.all([
      segments.verifySkuUniqueness({
        allowDuplicateSku: imagesOnly ? true : allowDuplicateSku,
        listingExternalId,
        sku: product.sku,
        token,
        inventoryId,
      }),
      (async () => {
        const initialWarehouseId = imagesOnly ? null : await getExportWarehouseId(targetInventoryId);
        return segments.resolveWarehouseAndStockMappings({
          imagesOnly,
          token,
          targetInventoryId,
          initialWarehouseId,
          mappings,
          productId,
        });
      })(),
    ]);
    let warehouseId = warehouseResolution.warehouseId;

    const baseImageDiagnostics = resolvedExportImagesAsBase64
      ? segments.buildImageDiagnosticsLogger({
          productId,
          connectionId,
          inventoryId: targetInventoryId,
          exportImagesAsBase64: resolvedExportImagesAsBase64,
          imageBase64Mode: resolvedImageBase64Mode,
          imageTransform: resolvedImageTransform,
        })
      : undefined;

    const exportExec = await segments.executeBaseExport({
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
      exportImagesAsBase64: resolvedExportImagesAsBase64,
      imageBase64Mode: resolvedImageBase64Mode,
      imageTransform: resolvedImageTransform,
      baseImageDiagnostics,
      product,
      canRetryWrite,
    });

    let { result, exportFields } = exportExec;
    warehouseId = exportExec.finalWarehouseId;
    const effectiveMappings = exportExec.finalMappings;

    if (!result.success && segments.isBaseImageError(result.error)) {
      await segments.logImageDiagnostics({
        product,
        imageBaseUrl,
        includeBase64: resolvedExportImagesAsBase64,
        base64Mode: resolvedImageBase64Mode,
        transform: resolvedImageTransform,
        context: {
          productId,
          connectionId,
          inventoryId: targetInventoryId,
          exportImagesAsBase64: resolvedExportImagesAsBase64,
          imageBase64Mode: resolvedImageBase64Mode,
        },
      });

      if (!resolvedExportImagesAsBase64 || !resolvedImageTransform) {
        const retryImagesAsBase64 = true;
        const retryImageBase64Mode = 'base-only' as const;
        const retryImageTransform = { forceJpeg: true, maxDimension: 1600, jpegQuality: 85 };
        const imageDiagnostics = segments.buildImageDiagnosticsLogger({
          productId,
          connectionId,
          inventoryId: targetInventoryId,
          exportImagesAsBase64: retryImagesAsBase64,
          imageBase64Mode: retryImageBase64Mode,
          imageTransform: retryImageTransform,
        });

        const retryExec = await segments.executeBaseExport({
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
          requestId,
        });
      }
      throw externalServiceError(result.error || 'Failed to export product', {
        productId,
        inventoryId: targetInventoryId,
      });
    }

    // Success path
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
        requestId,
      });
    }

    const normalizedExternalProductId = result.productId?.trim() || '';
    const normalizedProductBaseId = product.baseProductId?.trim() || '';
    if (normalizedExternalProductId && normalizedProductBaseId !== normalizedExternalProductId) {
      await productRepo
        .updateProduct(productId, { baseProductId: normalizedExternalProductId })
        .catch((error) => {
          void ErrorSystem.captureException(error);
        });
    }

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
          jobId,
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
  } catch (error) {
    void ErrorSystem.captureException(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to export product to Base.com.';
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
        finishedAt: new Date().toISOString(),
        errorMessage,
        meta: { ...runMeta, failedAt: new Date().toISOString() },
      })
      .catch(() => undefined);
    throw error;
  }
}
