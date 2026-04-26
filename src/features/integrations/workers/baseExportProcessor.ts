import 'server-only';
import { checkBaseSkuExists, getExportWarehouseId, resolveBaseConnectionToken } from '@/features/integrations/server';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { BaseExportJobData } from './baseExportQueue';
import * as Segments from '@/features/integrations/services/base-export-segments';

const BASE_EXPORT_SOURCE = 'base-export-queue';
async function loadSegments(): Promise<any> { return import('@/features/integrations/services/base-export-segments'); }

async function handleJobFailure(runId: string, runMeta: Record<string, unknown>, error: unknown, jobId: string): Promise<void> {
  const runRepository = await getPathRunRepository();
  void ErrorSystem.captureException(error);
  const errorMessage = error instanceof Error ? error.message : 'Failed to export product to Base.com.';
  await runRepository.createRunEvent({ runId, level: 'error', message: `Export failed: ${errorMessage}`, metadata: { jobId } }).catch(() => undefined);
  await runRepository.updateRun(runId, { status: 'failed', finishedAt: new Date().toISOString(), errorMessage, meta: { ...runMeta, failedAt: new Date().toISOString() } }).catch(() => undefined);
  throw error;
}

export async function processBaseExportJob(data: BaseExportJobData, jobId: string): Promise<void> {
  const runRepository = await getPathRunRepository();
  const runMeta = { source: BASE_EXPORT_SOURCE, jobId };
  try {
    const sRun = await runRepository.updateRunIfStatus(data.runId, ['queued'], { status: 'running', startedAt: new Date().toISOString(), meta: { ...runMeta, productId: data.productId } }).catch(() => null);
    if (sRun) await runRepository.createRunEvent({ runId: data.runId, level: 'info', message: 'Export started.', metadata: { jobId } }).catch(() => undefined);
    
    const { product, connection, integrations, primaryListingRepo, productRepo } = await Segments.loadExportResources(data.productId, data.connectionId);
    if (!product) throw externalServiceError('Product not found', { productId: data.productId });
    if (!connection) throw externalServiceError('Connection not found', { connectionId: data.connectionId });
    
    const preparedContext = await Segments.prepareBaseExportMappingsAndProduct<ProductWithImages>({
      data: { connectionId: data.connectionId, inventoryId: data.inventoryId, templateId: data.templateId ?? undefined, imagesOnly: data.imagesOnly, listingId: data.listingId ?? undefined, externalListingId: data.externalListingId ?? undefined, allowDuplicateSku: data.allowDuplicateSku ?? false, exportImagesAsBase64: data.exportImagesAsBase64 ?? undefined, imageBase64Mode: data.imageBase64Mode ?? undefined, imageTransform: data.imageTransform },
      imagesOnly: data.imagesOnly, productId: data.productId, resolvedInventoryId: data.inventoryId, product: { ...product, categoryId: product.categoryId ?? null }
    });
    
    const integration = integrations.find((i: any) => ['baselinker', 'base-com', 'base'].includes(i.slug));
    const tokenRes = resolveBaseConnectionToken({ baseApiToken: connection.baseApiToken });
    const token = tokenRes.token ?? '';
    if (token === '') throw badRequestError(tokenRes.error ?? 'No Base API token configured.', { connectionId: data.connectionId });
    const listingRes = await Segments.resolveListingForExport({ productId: data.productId, connectionId: data.connectionId, inventoryId: data.inventoryId, imagesOnly: data.imagesOnly, externalListingId: data.externalListingId, listingIdFromData: data.listingId, baseIntegrationId: integration?.id ?? connection.integrationId ?? null, primaryListingRepo });
    
    const targetInvId = (data.imagesOnly && listingRes.listingInventoryId !== null) ? listingRes.listingInventoryId : data.inventoryId;
    const warehouseRes = await Segments.resolveWarehouseAndStockMappings({ imagesOnly: data.imagesOnly, token, targetInventoryId: targetInvId, initialWarehouseId: data.imagesOnly ? null : await getExportWarehouseId(targetInvId), mappings: preparedContext.mappings, productId: data.productId });
    await Segments.verifySkuUniqueness({ allowDuplicateSku: data.imagesOnly ? true : (data.allowDuplicateSku ?? false), listingExternalId: listingRes.listingExternalId, sku: product.sku, token, inventoryId: data.inventoryId });

    const diag = preparedContext.exportImagesAsBase64 ? Segments.buildImageDiagnosticsLogger({ productId: data.productId, connectionId: data.connectionId, inventoryId: targetInvId, exportImagesAsBase64: preparedContext.exportImagesAsBase64, imageBase64Mode: preparedContext.imageBase64Mode, imageTransform: preparedContext.imageTransform }) : undefined;
    let exec = await Segments.executeBaseExport({ imagesOnly: data.imagesOnly, token, targetInventoryId: targetInvId, exportProduct: preparedContext.exportProduct, effectiveMappings: warehouseRes.effectiveMappings, warehouseId: warehouseRes.warehouseId, listingExternalId: listingRes.listingExternalId, imageBaseUrl: data.imageBaseUrl, stockWarehouseAliases: warehouseRes.stockWarehouseAliases ?? undefined, exportImagesAsBase64: preparedContext.exportImagesAsBase64, imageBase64Mode: preparedContext.imageBase64Mode, imageTransform: preparedContext.imageTransform, baseImageDiagnostics: diag, product, canRetryWrite: data.imagesOnly || (listingRes.listingExternalId !== null) });
    
    if (!exec.result.success && Segments.isBaseImageError(exec.result.error)) exec = await Segments.executeBaseExport({ ...exec, exportImagesAsBase64: true, imageBase64Mode: 'base-only', imageTransform: { forceJpeg: true, maxDimension: 1600, jpegQuality: 85 }, baseImageDiagnostics: Segments.buildImageDiagnosticsLogger({ productId: data.productId, connectionId: data.connectionId, inventoryId: targetInvId, exportImagesAsBase64: true, imageBase64Mode: 'base-only', imageTransform: { forceJpeg: true, maxDimension: 1600, jpegQuality: 85 } }) });
    
    if (!exec.result.success && !data.imagesOnly && product.sku) {
      const check = await checkBaseSkuExists(token, targetInvId, product.sku);
      if (check.exists) exec.result = { success: true, productId: check.productId };
    }
    
    if (!exec.result.success) throw externalServiceError(exec.result.error || 'Failed to export', { productId: data.productId });
    const nExt = exec.result.productId?.trim() ?? ''; const nBase = product.baseProductId?.trim() ?? '';
    if (nExt !== '' && nBase !== nExt) await productRepo.updateProduct(data.productId, { baseProductId: nExt }).catch((e: unknown) => ErrorSystem.captureException(e));
    await runRepository.updateRun(data.runId, { status: 'completed', finishedAt: new Date().toISOString() }).catch(() => undefined);
  } catch (error) { await handleJobFailure(data.runId, runMeta, error, jobId); }
}
