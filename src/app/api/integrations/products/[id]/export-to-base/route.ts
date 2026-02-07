export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductRepository } from "@/features/products/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { getProductListingRepository } from "@/features/integrations/server";
import {
  getExportWarehouseId
} from "@/features/integrations/server";
import {
  getExportDefaultInventoryId,
  getExportStockFallbackEnabled,
  listExportTemplates
} from "@/features/integrations/server";
import {
  buildBaseProductData,
  collectProductImageDiagnostics,
  exportProductImagesToBase,
  exportProductToBase,
  getProductImagesAsBase64,
  normalizeStockKey,
  type ImageBase64Mode,
  type ImageExportDiagnostics,
  type ImageTransformOptions
} from "@/features/integrations/server";
import { checkBaseSkuExists, fetchBaseWarehouses } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { LogCapture } from "@/features/integrations/server";
import { parseJsonBody } from "@/features/products/server";
import { ErrorSystem } from "@/features/observability/server";
import {
  badRequestError,
  conflictError,
  externalServiceError,
  notFoundError
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(), // Allow exporting even if SKU exists in Base.com
  exportImagesAsBase64: z.boolean().optional(), // Export images as base64 data blobs instead of URLs
  imageBase64Mode: z.enum(["base-only", "full-data-uri"]).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional()
    })
    .optional()
});

const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const isBaseImageError = (message: string | undefined) => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes("zdjec") ||
    normalized.includes("image") ||
    normalized.includes("photo")
  );
};

const buildImageDiagnosticsLogger = (
  context: Record<string, unknown>
): ImageExportDiagnostics => ({
  log: (message, data) => {
    void ErrorSystem.logWarning(`[export-to-base][images] ${message}`, {
      ...context,
      ...(data ?? {})
    });
  }
});

const logImageDiagnostics = async ({
  product,
  imageBaseUrl,
  includeBase64,
  base64Mode,
  transform,
  context
}: {
  product: Parameters<typeof collectProductImageDiagnostics>[0];
  imageBaseUrl: string | null;
  includeBase64: boolean;
  base64Mode: ImageBase64Mode;
  transform?: ImageTransformOptions | null;
  context: Record<string, unknown>;
}) => {
  const urlDiagnostics = collectProductImageDiagnostics(product, imageBaseUrl);
  void ErrorSystem.logWarning("[export-to-base][images] Image candidates", {
    ...context,
    images: urlDiagnostics
  });

  if (!includeBase64) return;

  try {
    const diagnostics = buildImageDiagnosticsLogger(context);
    await getProductImagesAsBase64(product, {
      diagnostics,
      outputMode: base64Mode,
      transform: transform ?? null
    });
  } catch (error) {
    void ErrorSystem.logWarning("[export-to-base][images] Failed to gather base64 diagnostics", {
      ...context,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * POST /api/integrations/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
 */
async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const logCapture = new LogCapture();
  logCapture.start();

  try {
    const { id: productId } = params;
    const parsed = await parseJsonBody(_req, exportSchema, {
      logPrefix: "export-to-base"
    });
    if (!parsed.ok) {
      logCapture.stop();
      return parsed.response;
    }
    const data = parsed.data;
    const requestId =
      _req.headers.get("idempotency-key") ??
      _req.headers.get("x-idempotency-key") ??
      _req.headers.get("x-request-id") ??
      undefined;
    const imagesOnly = data.imagesOnly ?? false;
    const forwardedHost =
      _req.headers.get("x-forwarded-host") ?? _req.headers.get("host");
    const forwardedProto =
      _req.headers.get("x-forwarded-proto") ?? "http";
    const imageBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(_req.url).origin;
    const defaultInventoryId = await getExportDefaultInventoryId();
    const resolvedInventoryId = defaultInventoryId || data.inventoryId;

    await ErrorSystem.logInfo("[export-to-base] Starting export", {
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      requestedInventoryId: data.inventoryId,
      defaultInventoryId,
      templateId: data.templateId || "none",
      imagesOnly
    });

    // Get product
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError("Product not found", { productId });
    }

    await ErrorSystem.logInfo("[export-to-base] Product loaded", {
      productId,
      sku: product.sku,
      name: product.name_en || product.name_pl || "unnamed"
    });

    let imageDiagnosticsContext = {
      productId,
      sku: product.sku,
      inventoryId: resolvedInventoryId,
      connectionId: data.connectionId
    };

    // Get connection to retrieve API token
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      data.connectionId
    );
    if (!connection) {
      throw notFoundError("Connection not found", {
        connectionId: data.connectionId
      });
    }

    await ErrorSystem.logInfo("[export-to-base] Connection loaded", {
      connectionId: data.connectionId,
      connectionName: connection.name,
      hasToken: Boolean(connection.baseApiToken || connection.password)
    });

    // Get Base.com token from connection
    let token: string | null = null;
    try {
      if (connection.baseApiToken) {
        token = decryptSecret(connection.baseApiToken);
      } else if (connection.password) {
        token = decryptSecret(connection.password);
      }
    } catch (_error) {
      throw badRequestError(
        "Failed to decrypt Base.com API token. Please re-save the connection token.",
        {
          connectionId: data.connectionId,
          connectionName: connection.name
        }
      );
    }

    if (!token) {
      throw badRequestError(
        "Base.com API token not found in connection. Please configure the API token in the connection settings.",
        {
          connectionId: data.connectionId,
          connectionName: connection.name
        }
      );
    }

    // Get template mappings if templateId provided
    let mappings: { sourceKey: string; targetField: string }[] = [];
    const hasImageOverrides = Boolean(data.imageBase64Mode || data.imageTransform);
    let exportImagesAsBase64 = imagesOnly
      ? true
      : data.exportImagesAsBase64 ?? hasImageOverrides;
    let imageBase64Mode: ImageBase64Mode = data.imageBase64Mode ?? "base-only";
    let imageTransform: ImageTransformOptions | null = null;
    if (data.imageTransform) {
      imageTransform = {};
      if (data.imageTransform.forceJpeg !== undefined)
        imageTransform.forceJpeg = data.imageTransform.forceJpeg;
      if (data.imageTransform.maxDimension !== undefined)
        imageTransform.maxDimension = data.imageTransform.maxDimension;
      if (data.imageTransform.jpegQuality !== undefined)
        imageTransform.jpegQuality = data.imageTransform.jpegQuality;
    }
    if (data.templateId && !imagesOnly) {
      const templates = await listExportTemplates();
      const template = templates.find((t) => t.id === data.templateId);
      if (template) {
        mappings = template.mappings;
        // Use template's exportImagesAsBase64 setting if not explicitly overridden
        if (
          !hasImageOverrides &&
          data.exportImagesAsBase64 === undefined &&
          template.exportImagesAsBase64 !== undefined
        ) {
          exportImagesAsBase64 = template.exportImagesAsBase64;
        }
      }
    }

    // Check for duplicate SKU in Base.com if not allowed
    const allowDuplicateSku = imagesOnly ? true : data.allowDuplicateSku ?? false;
    if (!allowDuplicateSku && product.sku) {
      await ErrorSystem.logInfo("[export-to-base] Checking if SKU exists in Base.com", {
        sku: product.sku,
        inventoryId: resolvedInventoryId
      });

      const skuVal = product.sku;
      const tokenVal = token;
      const skuCheck = await checkBaseSkuExists(
        tokenVal,
        resolvedInventoryId,
        skuVal
      );
      if (skuCheck.exists) {
        await ErrorSystem.logWarning("[export-to-base] SKU already exists in Base.com", {
          sku: product.sku,
          existingProductId: skuCheck.productId
        });
        throw conflictError(
          `SKU "${product.sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
          {
            skuExists: true,
            existingProductId: skuCheck.productId,
            sku: product.sku
          }
        );
      }
    }

    const listingRepo = await getProductListingRepository();
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) =>
      ["baselinker", "base-com"].includes(i.slug)
    );
    let listingId: string | null = null;
    let listingExternalId: string | null = data.externalListingId ?? null;
    let listingInventoryId: string | null = null;
    if (baseIntegration) {
      if (imagesOnly) {
        let existingListing = null;
        if (data.listingId) {
          const listing = await listingRepo.getListingById(data.listingId);
          if (listing && listing.productId === productId) {
            existingListing = listing;
          }
        }
        if (!existingListing) {
          const listings = await listingRepo.getListingsByProductId(productId);
          existingListing = listings.find(
            (l) => l.connectionId === data.connectionId
          );
        }
        if (existingListing) {
          listingId = existingListing.id;
          listingExternalId = existingListing.externalListingId ?? listingExternalId;
          listingInventoryId = existingListing.inventoryId ?? null;
          await listingRepo.updateListingStatus(existingListing.id, "pending");
          if (
            listingExternalId &&
            existingListing.externalListingId !== listingExternalId
          ) {
            await listingRepo.updateListingExternalId(
              existingListing.id,
              listingExternalId
            );
          }
        }
        if (!listingExternalId) {
          throw badRequestError(
            "Images-only export requires an existing Base.com listing. Export the product first."
          );
        }
      } else {
        const exists = await listingRepo.listingExists(productId, data.connectionId);
        if (!exists) {
          const newListing = await listingRepo.createListing({
            productId,
            integrationId: baseIntegration.id,
            connectionId: data.connectionId,
            externalListingId: null,
            inventoryId: resolvedInventoryId
          });
          listingId = newListing.id;
        } else {
          const listings = await listingRepo.getListingsByProductId(productId);
          const existingListing = listings.find(
            (l) => l.connectionId === data.connectionId
          );
          if (existingListing) {
            listingId = existingListing.id;
            await listingRepo.updateListingStatus(existingListing.id, "pending");
            if (existingListing.inventoryId !== resolvedInventoryId) {
              await listingRepo.updateListingInventoryId(
                existingListing.id,
                resolvedInventoryId
              );
            }
          }
        }
      }
    }

    if (requestId && listingId) {
      const existingListing = await listingRepo.getListingById(listingId);
      const history = existingListing?.exportHistory ?? [];
      const prior = history.find(
        (event) => event.requestId === requestId && event.status === "success"
      );
      if (prior) {
        logCapture.stop();
        const logs = logCapture.getLogs();
        return NextResponse.json({
          success: true,
          message: "Export already completed",
          externalProductId:
            prior.externalListingId ?? existingListing?.externalListingId ?? null,
          idempotent: true,
          logs
        });
      }
    }

    const targetInventoryId =
      imagesOnly && listingInventoryId ? listingInventoryId : resolvedInventoryId;
    imageDiagnosticsContext = {
      ...imageDiagnosticsContext,
      inventoryId: targetInventoryId
    };

    let warehouseId = imagesOnly ? null : await getExportWarehouseId(targetInventoryId);
    let stockWarehouseAliases: Record<string, string> | null = null;
    let validWarehouseIds: Set<string> | null = null;
    if (!imagesOnly) {
      try {
        const warehouses = await fetchBaseWarehouses(token, targetInventoryId);
        const warehouseIdSet = new Set<string>();
        const warehouseAliases: Record<string, string> = {};
        const inferTypedWarehouseId = (value: string) => {
          const match = value.match(/([a-z]+)[_-]?(\d+)/i);
          if (!match?.[1] || !match?.[2]) return null;
          const typed = `${match[1].toLowerCase()}_${match[2]}`;
          return { typed, numeric: match[2] };
        };
        for (const warehouse of warehouses) {
          warehouseIdSet.add(warehouse.id);
          const inferred = warehouse.typedId ?? inferTypedWarehouseId(warehouse.id)?.typed;
          if (inferred) {
            warehouseIdSet.add(inferred);
            if (inferred !== warehouse.id) {
              const numeric = inferTypedWarehouseId(inferred)?.numeric;
              if (numeric) {
                warehouseAliases[numeric] = inferred;
              } else {
                warehouseAliases[warehouse.id] = inferred;
              }
            }
          }
          if (warehouse.typedId && warehouse.typedId !== warehouse.id) {
            warehouseAliases[warehouse.id] = warehouse.typedId;
          }
        }
        if (warehouseId) {
          const inferred = inferTypedWarehouseId(warehouseId);
          if (inferred?.numeric && inferred.typed) {
            warehouseAliases[inferred.numeric] = inferred.typed;
            warehouseIdSet.add(inferred.typed);
          }
        }
        stockWarehouseAliases =
          Object.keys(warehouseAliases).length > 0 ? warehouseAliases : null;
        validWarehouseIds = warehouseIdSet;
        if (warehouseId && stockWarehouseAliases && stockWarehouseAliases[warehouseId]) {
          warehouseId = stockWarehouseAliases[warehouseId] ?? null;
        } else if (warehouseId) {
          const match = warehouses.find(
            (warehouse) =>
              warehouse.id === warehouseId || warehouse.typedId === warehouseId
          );
          if (match?.typedId) {
            warehouseId = match.typedId ?? null;
          }
        }
        if (warehouseId) {
          if (!validWarehouseIds.has(warehouseId)) {
            const fallbackWarehouseId =
              warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
            await ErrorSystem.logWarning("[export-to-base] Warehouse not in inventory, using fallback", {
              warehouseId,
              fallbackWarehouseId,
              inventoryId: targetInventoryId
            });
            warehouseId = fallbackWarehouseId;
          }
        } else {
          warehouseId = warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
        }
      } catch (error) {
        await ErrorSystem.logWarning("[export-to-base] Failed to verify warehouse, skipping stock export", {
          warehouseId,
          inventoryId: targetInventoryId,
          error
        });
        validWarehouseIds = null;
      }
    }

    const normalizeStockMappingKey = (value: string) => {
      const trimmed = value.trim();
      const withoutPrefix = trimmed.replace(/^stock[._-]?/i, "");
      return normalizeStockKey(withoutPrefix);
    };

    const filterStockMappings = (entries: typeof mappings) => {
      if (!validWarehouseIds) return entries;
      return entries.filter((mapping) => {
        const key = mapping.sourceKey.trim();
        const lowered = key.toLowerCase();
        if (!lowered.startsWith("stock")) return true;
        const normalized = normalizeStockMappingKey(key);
        if (!normalized) return true;
        return validWarehouseIds.has(normalized);
      });
    };

    let effectiveMappings = imagesOnly ? [] : filterStockMappings(mappings);

    // Export to Base.com
    await ErrorSystem.logInfo("[export-to-base] Calling Base.com API", {
      productId,
      inventoryId: targetInventoryId,
      mappingsCount: effectiveMappings.length
    });

    const baseImageDiagnostics = exportImagesAsBase64
      ? buildImageDiagnosticsLogger({
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        })
      : undefined;

    const buildExportSnapshot = async (
      targetWarehouseId: string | null,
      activeMappings: typeof mappings = effectiveMappings,
      includeStockWithoutWarehouse = false
    ) => {
      const exportData = await buildBaseProductData(
        product,
        activeMappings,
        targetWarehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
          imagesOnly
        }
      ) as Record<string, unknown> & {
        text_fields?: Record<string, unknown>;
        prices?: Record<string, unknown>;
        stock?: Record<string, unknown>;
      };
      const exportFields = Object.keys(exportData).flatMap((key) => {
        if (key === "text_fields" && exportData.text_fields && typeof exportData.text_fields === "object") {
          return Object.keys(exportData.text_fields).map((field) => `text_fields.${field}`);
        }
        if (key === "prices" && exportData.prices && typeof exportData.prices === "object") {
          return Object.keys(exportData.prices).map((field) => `prices.${field}`);
        }
        if (key === "stock" && exportData.stock && typeof exportData.stock === "object") {
          return Object.keys(exportData.stock).map((field) => `stock.${field}`);
        }
        return [key];
      });
      return { exportData, exportFields };
    };

    const allowStockFallback = imagesOnly
      ? false
      : await getExportStockFallbackEnabled();
    let includeStockWithoutWarehouse =
      !imagesOnly && !warehouseId && product.stock !== null;
    let exportFields = imagesOnly ? ["images"] : [];
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
          product,
          listingExternalId as string,
          {
            imageBaseUrl,
            exportImagesAsBase64: exportImagesAsBase64,
            ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
            imageBase64Mode,
            imageTransform
          }
        )
      : await exportProductToBase(
          token,
          targetInventoryId,
          product,
          effectiveMappings,
          warehouseId,
          {
            imageBaseUrl,
            includeStockWithoutWarehouse,
            ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
            exportImagesAsBase64: exportImagesAsBase64,
            ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
            imageBase64Mode,
            imageTransform
          }
        );

    const isWarehouseMismatch = (message: string | undefined) =>
      typeof message === "string" &&
      message.toLowerCase().includes("warehouse") &&
      message.toLowerCase().includes("not included");

    const isStockMismatch = (message: string | undefined) =>
      typeof message === "string" &&
      (message.toLowerCase().includes("stock") ||
        message.toLowerCase().includes("quantity"));

    const warehouseMismatch = !imagesOnly && isWarehouseMismatch(result.error);

    if (!imagesOnly && !result.success && warehouseMismatch && allowStockFallback) {
      await ErrorSystem.logWarning("[export-to-base] Warehouse mismatch, retrying without stock", {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping.sourceKey.trim().toLowerCase().startsWith("stock")
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
        product,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        }
      );
    } else if (!imagesOnly && !result.success && warehouseMismatch) {
      await ErrorSystem.logWarning("[export-to-base] Warehouse mismatch, failing export", {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
    }

    if (
      !imagesOnly &&
      !result.success &&
      !warehouseMismatch &&
      includeStockWithoutWarehouse &&
      isStockMismatch(result.error)
    ) {
      await ErrorSystem.logWarning("[export-to-base] Retrying without stock export", {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping.sourceKey.trim().toLowerCase().startsWith("stock")
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
        product,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
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
          imageBase64Mode
        }
      });

      if (!exportImagesAsBase64 || !imageTransform) {
        void ErrorSystem.logWarning("[export-to-base] Image export failed, retrying with base64 + JPEG resize", {
          ...imageDiagnosticsContext,
          error: result.error
        });
        exportImagesAsBase64 = true;
        imageBase64Mode = "base-only";
        imageTransform = {
          forceJpeg: true,
          maxDimension: 1600,
          jpegQuality: 85
        };
        const imageDiagnostics = buildImageDiagnosticsLogger({
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        });
        if (!imagesOnly) {
          ({ exportFields } = await buildExportSnapshot(
            warehouseId,
            effectiveMappings,
            includeStockWithoutWarehouse
          ));
        }
        result = imagesOnly
          ? await exportProductImagesToBase(
              token,
              targetInventoryId,
              product,
              listingExternalId as string,
              {
                imageBaseUrl,
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform
              }
            )
          : await exportProductToBase(
              token,
              targetInventoryId,
              product,
              effectiveMappings,
              warehouseId,
              {
                imageBaseUrl,
                includeStockWithoutWarehouse,
                ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform
              }
            );
      }
    }

    if (!result.success) {
      if (listingId) {
        await listingRepo.updateListingStatus(listingId, "failed");
        await listingRepo.appendExportHistory(listingId, {
          exportedAt: new Date(),
          status: "failed",
          inventoryId: targetInventoryId,
          templateId: data.templateId ?? null,
          warehouseId,
          externalListingId: result.productId || null,
          fields: exportFields,
          requestId: requestId ?? null
        });
      }
      throw externalServiceError(result.error || "Failed to export product", {
        productId,
        inventoryId: targetInventoryId
      });
    }

    await ErrorSystem.logInfo("[export-to-base] Export successful", {
      productId,
      externalProductId: result.productId
    });

    if (listingId) {
      if (result.productId) {
        await listingRepo.updateListingExternalId(listingId, result.productId);
      }
      await listingRepo.updateListingStatus(listingId, "active");
      await listingRepo.appendExportHistory(listingId, {
        exportedAt: new Date(),
        status: "success",
        inventoryId: targetInventoryId,
        templateId: data.templateId ?? null,
        warehouseId,
        externalListingId: result.productId || null,
        fields: exportFields,
        requestId: requestId ?? null
      });
    }

    logCapture.stop();
    const logs = logCapture.getLogs();

    return NextResponse.json({
      success: true,
      message: "Product successfully exported to Base.com",
      externalProductId: result.productId,
      logs
    });
  } catch (error) {
    logCapture.stop();
    const logs = logCapture.getLogs();
    // Re-throw with extra logs context
    if (error instanceof Error && "meta" in error) {
      (error as any).meta = { ...(error as any).meta, logs };
    }
    throw error;
  }
}

export const POST = apiHandlerWithParams<{ id: string }>(
  POST_handler,
  { source: "integrations.products.[id].export-to-base.POST", requireCsrf: false }
);
