import { NextRequest, NextResponse } from 'next/server';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { auth } from '@/features/auth/server';
import {
  buildBaseProductData,
  checkBaseSkuExists,
  exportProductImagesToBase,
  exportProductToBase,
  getExportWarehouseId,
  getIntegrationRepository,
  getProductListingRepository,
  getExportStockFallbackEnabled,
  LogCapture,
  findProductListingByIdAcrossProviders,
  findProductListingByProductAndConnectionAcrossProviders,
} from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  parseJsonBody,
  getProductRepository,
  type ProductWithImagesDto as ProductWithImages,
} from '@/features/products/server';
import type { ProductListingExportEvent } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  badRequestError,
  conflictError,
  externalServiceError,
  notFoundError,
} from '@/shared/errors/app-error';

import {
  BASE_EXPORT_RUN_PATH_ID,
  BASE_EXPORT_RUN_PATH_NAME,
  BASE_EXPORT_SOURCE,
  clearExpiredExportRequestLocks,
  inFlightExportRequests,
  exportSchema,
  type BaseExportRequestData,
  type BaseFieldMapping,
  type BaseExportProductLike,
} from './helpers';
import {
  isBaseImageError,
  buildImageDiagnosticsLogger,
  logImageDiagnostics,
} from './segments/images';
import { prepareBaseExportMappingsAndProduct } from './segments/preparation';
import { resolveWarehouseAndStockMappings } from './segments/stock';

/**
 * POST /api/integrations/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
 */
export async function postExportToBaseHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const logCapture = new LogCapture();
  logCapture.start();
  const runRepository = await getPathRunRepository();
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
    // Parallelize resource loading and initial run preparation
    const [productRepo, integrationRepo, primaryListingRepo] = await Promise.all([
      getProductRepository(),
      getIntegrationRepository(),
      getProductListingRepository(),
    ]);

    const [product, connection, integrations, session] = await Promise.all([
      productRepo.getProductById(productId),
      integrationRepo.getConnectionById(data.connectionId),
      integrationRepo.listIntegrations(),
      auth().catch(() => null),
    ]);

    if (!product) {
      throw notFoundError('Product not found', { productId });
    }

    if (!connection) {
      throw notFoundError('Connection not found', {
        connectionId: data.connectionId,
      });
    }

    const userId = session?.user?.id ?? null;

    // Concurrently create the run and prepare mappings
    const [createdRun, preparedExportContext] = await Promise.all([
      runRepository.createRun({
        userId,
        pathId: BASE_EXPORT_RUN_PATH_ID,
        pathName: BASE_EXPORT_RUN_PATH_NAME,
        triggerEvent: 'export_to_base',
        triggerNodeId: `product:${productId}`,
        entityId: productId,
        entityType: 'product',
        meta: {
          ...runMeta,
          sourceInfo: {
            tab: 'products',
            location: 'product-listing',
            action: 'export_to_base',
            productId,
            connectionId: data.connectionId,
            inventoryId: resolvedInventoryId,
            imagesOnly,
          },
          templateId: data.templateId ?? null,
          imagesOnly,
        },
        maxAttempts: 1,
        retryCount: 0,
      }),
      prepareBaseExportMappingsAndProduct({
        data,
        imagesOnly,
        productId: productId,
        resolvedInventoryId: resolvedInventoryId,
        product: {
          ...product,
          categoryId: product.categoryId ?? null,
        } as unknown as BaseExportProductLike,
      }),
      ErrorSystem.logInfo('[export-to-base] Resources loaded and mapping prepared', {
        productId,
        sku: product.sku,
        connectionName: connection.name,
      }),
    ]);

    const createdRunId = createdRun.id;
    runId = createdRunId;

    // Non-blocking update and event creation
    void (async () => {
      try {
        await runRepository.updateRun(createdRunId, {
          status: 'running',
          startedAt: new Date().toISOString(),
        });
        await runRepository.createRunEvent({
          runId: createdRunId,
          level: 'info',
          message: 'Export to Base.com started.',
          metadata: {
            productId,
            connectionId: data.connectionId,
            inventoryId: resolvedInventoryId,
            imagesOnly,
          },
        });
      } catch {
        // Keep flow resilient
      }
    })();
    const mappings = preparedExportContext.mappings;
    const resolvedTemplateId = preparedExportContext.resolvedTemplateId;
    const requestedTemplateId = preparedExportContext.requestedTemplateId;
    let exportImagesAsBase64 = preparedExportContext.exportImagesAsBase64;
    let imageBase64Mode = preparedExportContext.imageBase64Mode;
    let imageTransform = preparedExportContext.imageTransform;
    const producerNameById = preparedExportContext.producerNameById;
    const producerExternalIdByInternalId = preparedExportContext.producerExternalIdByInternalId;
    const tagNameById = preparedExportContext.tagNameById;
    const tagExternalIdByInternalId = preparedExportContext.tagExternalIdByInternalId;
    const exportProduct = preparedExportContext.exportProduct;

    let listingRepo = primaryListingRepo;
    const baseIntegration = integrations.find((i: (typeof integrations)[number]) =>
      ['baselinker', 'base-com', 'base'].includes(i.slug)
    );
    const baseIntegrationId = baseIntegration?.id ?? connection.integrationId ?? null;
    const tokenResolution = resolveBaseConnectionToken(connection);
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error ??
          'No Base API token configured. Please test or re-save the connection.',
        { connectionId: data.connectionId }
      );
    }
    const token = tokenResolution.token;

    let imageDiagnosticsContext: Record<string, unknown> = {
      productId,
      connectionId: data.connectionId,
    };

    if (!baseIntegration && baseIntegrationId) {
      await ErrorSystem.logWarning(
        '[export-to-base] Base integration slug not found while resolving listing badge integration; falling back to connection.integrationId.',
        {
          productId,
          connectionId: data.connectionId,
          fallbackIntegrationId: baseIntegrationId,
        }
      );
    }
    let listingId: string | null = null;
    let listingExternalId: string | null = data.externalListingId ?? null;
    let listingInventoryId: string | null = null;
    if (baseIntegrationId) {
      if (imagesOnly) {
        let existingListing: {
          id: string;
          productId: string;
          connectionId: string;
          externalListingId: string | null;
          inventoryId?: string | null;
        } | null = null;
        if (data.listingId) {
          const resolvedById = await findProductListingByIdAcrossProviders(data.listingId);
          if (resolvedById?.listing.productId === productId) {
            existingListing = resolvedById.listing;
            listingRepo = resolvedById.repository;
          }
        }
        if (!existingListing) {
          const resolvedByConnection =
            await findProductListingByProductAndConnectionAcrossProviders(
              productId,
              data.connectionId
            );
          if (resolvedByConnection) {
            existingListing = resolvedByConnection.listing;
            listingRepo = resolvedByConnection.repository;
          }
        }
        if (existingListing) {
          listingId = existingListing.id;
          listingExternalId = existingListing.externalListingId ?? listingExternalId;
          listingInventoryId = existingListing.inventoryId ?? null;
          await listingRepo.updateListingStatus(existingListing.id, 'pending');
          if (listingExternalId && existingListing.externalListingId !== listingExternalId) {
            await listingRepo.updateListingExternalId(existingListing.id, listingExternalId);
          }
        }
        if (!listingExternalId) {
          throw badRequestError(
            'Images-only export requires an existing Base.com listing. Export the product first.'
          );
        }
      } else {
        const resolvedByConnection = await findProductListingByProductAndConnectionAcrossProviders(
          productId,
          data.connectionId
        );
        if (!resolvedByConnection) {
          const newListing = await primaryListingRepo.createListing({
            productId,
            integrationId: baseIntegrationId,
            connectionId: data.connectionId,
            externalListingId: null,
            inventoryId: resolvedInventoryId,
            marketplaceData: {
              source: 'base-export',
              marketplace: 'base',
            },
          });
          listingRepo = primaryListingRepo;
          listingId = newListing.id;
        } else {
          const existingListing = resolvedByConnection.listing;
          listingRepo = resolvedByConnection.repository;
          listingId = existingListing.id;
          // Load externalListingId from the existing listing so re-exports UPDATE the
          // Base.com product rather than creating a duplicate, and so the SKU check is
          // skipped (the product is already in Base.com under our control).
          listingExternalId = existingListing.externalListingId ?? listingExternalId;
          await listingRepo.updateListingStatus(existingListing.id, 'pending');
          if (existingListing.inventoryId !== resolvedInventoryId) {
            await listingRepo.updateListingInventoryId(existingListing.id, resolvedInventoryId);
          }
        }
      }
    }

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
                requestId: requestId ?? null,
                idempotent: true,
              },
            })
            .catch(() => undefined);
          await runRepository
            .updateRun(runId, {
              status: 'completed',
              finishedAt: new Date().toISOString(),
              meta: {
                ...runMeta,
                idempotent: true,
                completedAt: new Date().toISOString(),
              },
            })
            .catch(() => undefined);
        }
        logCapture.stop();
        const logs = logCapture.getLogs();
        return NextResponse.json({
          success: true,
          message: 'Export already completed',
          externalProductId: prior.externalListingId ?? existingListing?.externalListingId ?? null,
          idempotent: true,
          runId,
          logs,
        });
      }
    }

    // Check for duplicate SKU in Base.com — skipped when the product already has a known
    // Base.com product_id (listingExternalId), which means this is a re-export/update,
    // not a new product creation.
    const allowDuplicateSku = imagesOnly ? true : (data.allowDuplicateSku ?? false);
    if (!allowDuplicateSku && !listingExternalId && product.sku) {
      await ErrorSystem.logInfo('[export-to-base] Checking if SKU exists in Base.com', {
        sku: product.sku,
        inventoryId: resolvedInventoryId,
      });

      const skuVal = product.sku;
      const tokenVal = token;
      const skuCheck = await checkBaseSkuExists(tokenVal, resolvedInventoryId, skuVal);
      if (skuCheck.exists) {
        await ErrorSystem.logWarning('[export-to-base] SKU already exists in Base.com', {
          sku: product.sku,
          existingProductId: skuCheck.productId,
        });
        throw conflictError(
          `SKU "${product.sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
          {
            skuExists: true,
            existingProductId: skuCheck.productId,
            sku: product.sku,
          }
        );
      }
    }

    const targetInventoryId =
      imagesOnly && listingInventoryId ? listingInventoryId : resolvedInventoryId;
    const canRetryWrite = imagesOnly || Boolean(listingExternalId);
    imageDiagnosticsContext = {
      ...imageDiagnosticsContext,
      inventoryId: targetInventoryId,
    };

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
    const stockWarehouseAliases = warehouseResolution.stockWarehouseAliases;
    let effectiveMappings = warehouseResolution.effectiveMappings;

    // Export to Base.com
    await ErrorSystem.logInfo('[export-to-base] Calling Base.com API', {
      productId,
      inventoryId: targetInventoryId,
      mappingsCount: effectiveMappings.length,
    });

    const baseImageDiagnostics = exportImagesAsBase64
      ? buildImageDiagnosticsLogger({
        ...imageDiagnosticsContext,
        exportImagesAsBase64,
        imageBase64Mode,
        imageTransform,
      })
      : undefined;

    const buildExportSnapshot = async (
      targetWarehouseId: string | null,
      activeMappings: typeof mappings = effectiveMappings,
      includeStockWithoutWarehouse = false
    ) => {
      const exportData = (await buildBaseProductData(
        exportProduct as unknown as ProductWithImages,
        activeMappings,
        targetWarehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
          imagesOnly,
        }
      )) as Record<string, unknown> & {
        text_fields?: Record<string, unknown>;
        prices?: Record<string, unknown>;
        stock?: Record<string, unknown>;
      };
      const exportFields = Object.keys(exportData).flatMap((key) => {
        if (
          key === 'text_fields' &&
          exportData.text_fields &&
          typeof exportData.text_fields === 'object'
        ) {
          return Object.keys(exportData.text_fields).map((field) => `text_fields.${field}`);
        }
        if (key === 'prices' && exportData.prices && typeof exportData.prices === 'object') {
          return Object.keys(exportData.prices).map((field) => `prices.${field}`);
        }
        if (key === 'stock' && exportData.stock && typeof exportData.stock === 'object') {
          return Object.keys(exportData.stock).map((field) => `stock.${field}`);
        }
        return [key];
      });
      return { exportData, exportFields };
    };

    const allowStockFallback = imagesOnly ? false : await getExportStockFallbackEnabled();
    let includeStockWithoutWarehouse = !imagesOnly && !warehouseId && product.stock !== null;
    let exportFields = imagesOnly ? ['images'] : [];
    if (!imagesOnly) {
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
    }
    let result = imagesOnly
      ? await exportProductImagesToBase(
        token,
        targetInventoryId,
          exportProduct as unknown as ProductWithImages,
          listingExternalId as string,
          {
            imageBaseUrl,
            exportImagesAsBase64: exportImagesAsBase64,
            ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
            imageBase64Mode,
            imageTransform,
          }
      )
      : await exportProductToBase(
        token,
        targetInventoryId,
          exportProduct as unknown as ProductWithImages,
          effectiveMappings,
          warehouseId,
          {
            imageBaseUrl,
            includeStockWithoutWarehouse,
            ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
            ...(producerNameById ? { producerNameById } : {}),
            ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
            ...(tagNameById ? { tagNameById } : {}),
            ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
            exportImagesAsBase64: exportImagesAsBase64,
            ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
            imageBase64Mode,
            imageTransform,
            existingProductId: listingExternalId ?? undefined,
          }
      );

    const isWarehouseMismatch = (message: string | undefined) =>
      typeof message === 'string' &&
      message.toLowerCase().includes('warehouse') &&
      message.toLowerCase().includes('not included');

    const isStockMismatch = (message: string | undefined) =>
      typeof message === 'string' &&
      (message.toLowerCase().includes('stock') || message.toLowerCase().includes('quantity'));

    const warehouseMismatch = !imagesOnly && isWarehouseMismatch(result.error);

    if (
      !imagesOnly &&
      !result.success &&
      warehouseMismatch &&
      allowStockFallback
    ) {
      await ErrorSystem.logWarning('[export-to-base] Warehouse mismatch, retrying without stock', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error,
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping: BaseFieldMapping) =>
          !String(mapping['sourceKey'] ?? '')
            .trim()
            .toLowerCase()
            .startsWith('stock')
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        targetInventoryId,
        exportProduct as unknown as ProductWithImages,
        effectiveMappings,
        warehouseId,

        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
          existingProductId: listingExternalId ?? undefined,
        }
      );
    } else if (!imagesOnly && !result.success && warehouseMismatch) {
      await ErrorSystem.logWarning('[export-to-base] Warehouse mismatch, failing export', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error,
      });
    }

    if (
      !imagesOnly &&
      canRetryWrite &&
      !result.success &&
      !warehouseMismatch &&
      includeStockWithoutWarehouse &&
      isStockMismatch(result.error)
    ) {
      await ErrorSystem.logWarning('[export-to-base] Retrying without stock export', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error,
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping: BaseFieldMapping) =>
          !String(mapping['sourceKey'] ?? '')
            .trim()
            .toLowerCase()
            .startsWith('stock')
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        targetInventoryId,
        exportProduct as unknown as ProductWithImages,
        effectiveMappings,
        warehouseId,

        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
          existingProductId: listingExternalId ?? undefined,
        }
      );
    }

    const imageError = isBaseImageError(result.error);

    if (!result.success && imageError) {
      await logImageDiagnostics({
        product,
        imageBaseUrl,
        includeBase64: exportImagesAsBase64,
        base64Mode: imageBase64Mode,
        transform: imageTransform,
        context: {
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode,
        },
      });

      if (!exportImagesAsBase64 || !imageTransform) {
        void ErrorSystem.logWarning(
          '[export-to-base] Image export failed, retrying with base64 + JPEG resize',
          {
            ...imageDiagnosticsContext,
            error: result.error,
          }
        );
        exportImagesAsBase64 = true;
        imageBase64Mode = 'base-only';
        imageTransform = {
          forceJpeg: true,
          maxDimension: 1600,
          jpegQuality: 85,
        };
        const imageDiagnostics = buildImageDiagnosticsLogger({
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
        });
        if (!imagesOnly) {
          ({ exportFields } = await buildExportSnapshot(
            warehouseId,
            effectiveMappings,
            includeStockWithoutWarehouse
          ));
        }
        if (canRetryWrite) {
          result = imagesOnly
            ? await exportProductImagesToBase(
              token,
              targetInventoryId,
                exportProduct as unknown as ProductWithImages,
                listingExternalId as string,
                {
                  imageBaseUrl,
                  exportImagesAsBase64: exportImagesAsBase64,
                  imageDiagnostics,
                  imageBase64Mode,
                  imageTransform,
                }
            )
            : await exportProductToBase(
              token,
              targetInventoryId,
                exportProduct as unknown as ProductWithImages,
                effectiveMappings,
                warehouseId,
                {
                  imageBaseUrl,
                  includeStockWithoutWarehouse,
                  ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
                  ...(producerNameById ? { producerNameById } : {}),
                  ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
                  ...(tagNameById ? { tagNameById } : {}),
                  ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
                  exportImagesAsBase64: exportImagesAsBase64,
                  imageDiagnostics,
                  imageBase64Mode,
                  imageTransform,
                  existingProductId: listingExternalId ?? undefined,
                }
            );
        } else {
          let existingExternalProductId: string | null = null;
          if (product.sku) {
            const skuCheck = await checkBaseSkuExists(token, targetInventoryId, product.sku);
            existingExternalProductId = skuCheck.productId ?? null;
          }

          if (existingExternalProductId) {
            listingExternalId = existingExternalProductId;
            result = await exportProductImagesToBase(
              token,
              targetInventoryId,
              exportProduct as unknown as ProductWithImages,
              existingExternalProductId,
              {
                imageBaseUrl,
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform,
              }
            );
          } else {
            result = await exportProductToBase(
              token,
              targetInventoryId,
              exportProduct as unknown as ProductWithImages,
              effectiveMappings,
              warehouseId,
              {
                imageBaseUrl,
                includeStockWithoutWarehouse,
                ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
                ...(producerNameById ? { producerNameById } : {}),
                ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
                ...(tagNameById ? { tagNameById } : {}),
                ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform,
                existingProductId: listingExternalId ?? undefined,
              }
            );
          }
        }
      }
    }

    if (!result.success && !imagesOnly && !canRetryWrite && product.sku) {
      const createdAfterTimeout = await checkBaseSkuExists(token, targetInventoryId, product.sku);
      if (createdAfterTimeout.exists) {
        await ErrorSystem.logWarning(
          '[export-to-base] Initial export failed but SKU now exists; treating export as successful to avoid duplicate create.',
          {
            productId,
            sku: product.sku,
            inventoryId: targetInventoryId,
            detectedExternalProductId: createdAfterTimeout.productId ?? null,
            originalError: result.error ?? null,
          }
        );
        result = {
          success: true,
          ...(createdAfterTimeout.productId ? { productId: createdAfterTimeout.productId } : {}),
        };
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

    await ErrorSystem.logInfo('[export-to-base] Export successful', {
      productId,
      externalProductId: result.productId,
    });

    if (listingId) {
      if (result.productId) {
        await listingRepo.updateListingExternalId(listingId, result.productId);
      }
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
      await runRepository
        .createRunEvent({
          runId,
          level: 'error',
          message: `Export failed: ${errorMessage}`,
          metadata: {
            logsCount: logs.length,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          errorMessage,
          meta: {
            ...runMeta,
            failedAt: new Date().toISOString(),
            logsCount: logs.length,
          },
        })
        .catch(() => undefined);
    }
    // Re-throw with extra logs context
    if (error instanceof Error && 'meta' in error) {
      const errorWithMeta = error as Error & { meta?: Record<string, unknown> };
      errorWithMeta.meta = { ...(errorWithMeta.meta ?? {}), logs };
    }
    throw error;
  } finally {
    if (requestLockKey) {
      inFlightExportRequests.delete(requestLockKey);
    }
  }
}
