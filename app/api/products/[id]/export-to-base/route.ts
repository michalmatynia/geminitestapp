import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductRepository } from "@/lib/services/product-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import {
  getExportWarehouseId,
} from "@/lib/services/import-template-repository";
import {
  getExportDefaultInventoryId,
  getExportStockFallbackEnabled,
  listExportTemplates,
} from "@/lib/services/export-template-repository";
import {
  buildBaseProductData,
  exportProductToBase,
  normalizeStockKey,
} from "@/lib/services/exports/base-exporter";
import { checkBaseSkuExists, fetchBaseWarehouses } from "@/lib/services/imports/base-client";
import { decryptSecret } from "@/lib/utils/encryption";

const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(), // Allow exporting even if SKU exists in Base.com
});

/**
 * POST /api/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json();
    const data = exportSchema.parse(body);
    const forwardedHost =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const forwardedProto =
      req.headers.get("x-forwarded-proto") ?? "http";
    const imageBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(req.url).origin;
    const defaultInventoryId = await getExportDefaultInventoryId();
    const resolvedInventoryId = defaultInventoryId || data.inventoryId;

    console.log("[export-to-base] Starting export", {
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      requestedInventoryId: data.inventoryId,
      defaultInventoryId,
      templateId: data.templateId || "none",
    });

    // Get product
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      console.error("[export-to-base] Product not found", { productId });
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("[export-to-base] Product loaded", {
      productId,
      sku: product.sku,
      name: product.name_en || product.name_pl || "unnamed",
    });

    // Get connection to retrieve API token
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      data.connectionId
    );
    if (!connection) {
      console.error("[export-to-base] Connection not found", {
        connectionId: data.connectionId,
      });
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    console.log("[export-to-base] Connection loaded", {
      connectionId: data.connectionId,
      connectionName: connection.name,
      hasToken: Boolean(connection.baseApiToken || connection.password),
    });

    // Get Base.com token from connection
    let token: string | null = null;
    try {
      if (connection.baseApiToken) {
        token = decryptSecret(connection.baseApiToken);
      } else if (connection.password) {
        token = decryptSecret(connection.password);
      }
    } catch (error) {
      console.error("[export-to-base] Failed to decrypt Base.com token", {
        connectionId: data.connectionId,
        connectionName: connection.name,
        error,
      });
      return NextResponse.json(
        { error: "Failed to decrypt Base.com API token. Please re-save the connection token." },
        { status: 400 }
      );
    }

    if (!token) {
      console.error("[export-to-base] No API token configured", {
        connectionId: data.connectionId,
        connectionName: connection.name,
      });
      return NextResponse.json(
        { error: "Base.com API token not found in connection. Please configure the API token in the connection settings." },
        { status: 400 }
      );
    }

    // Get template mappings if templateId provided
    let mappings: { sourceKey: string; targetField: string }[] = [];
    if (data.templateId) {
      const templates = await listExportTemplates();
      const template = templates.find((t) => t.id === data.templateId);
      if (template) {
        mappings = template.mappings;
      }
    }

    // Check for duplicate SKU in Base.com if not allowed
    const allowDuplicateSku = data.allowDuplicateSku ?? false;
    if (!allowDuplicateSku && product.sku) {
      console.log("[export-to-base] Checking if SKU exists in Base.com", {
        sku: product.sku,
        inventoryId: resolvedInventoryId,
      });

      const skuVal = product.sku as string;
      const tokenVal = token as string;
      const skuCheck = await checkBaseSkuExists(
        tokenVal,
        resolvedInventoryId,
        skuVal
      );
      if (skuCheck.exists) {
        console.warn("[export-to-base] SKU already exists in Base.com", {
          sku: product.sku,
          existingProductId: skuCheck.productId,
        });
        return NextResponse.json(
          {
            error: `SKU "${product.sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
            skuExists: true,
            existingProductId: skuCheck.productId,
          },
          { status: 409 }
        );
      }
    }

    const listingRepo = await getProductListingRepository();
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) =>
      ["baselinker", "base-com"].includes(i.slug)
    );
    let listingId: string | null = null;
    if (baseIntegration) {
      const exists = await listingRepo.listingExists(productId, data.connectionId);
      if (!exists) {
        const newListing = await listingRepo.createListing({
          productId,
          integrationId: baseIntegration.id,
          connectionId: data.connectionId,
          externalListingId: null,
          inventoryId: resolvedInventoryId,
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

    let warehouseId = await getExportWarehouseId(resolvedInventoryId);
    let stockWarehouseAliases: Record<string, string> | null = null;
    let validWarehouseIds: Set<string> | null = null;
    try {
      const warehouses = await fetchBaseWarehouses(token, resolvedInventoryId);
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
      if (warehouseId && stockWarehouseAliases?.[warehouseId]) {
        warehouseId = stockWarehouseAliases[warehouseId]!;
      } else if (warehouseId) {
        const match = warehouses.find(
          (warehouse) =>
            warehouse.id === warehouseId || warehouse.typedId === warehouseId
        );
        if (match?.typedId) {
          warehouseId = match.typedId;
        }
      }
      if (warehouseId) {
        if (!validWarehouseIds.has(warehouseId)) {
          const fallbackWarehouseId =
            warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
          console.warn("[export-to-base] Warehouse not in inventory, using fallback", {
            warehouseId,
            fallbackWarehouseId,
            inventoryId: resolvedInventoryId,
          });
          warehouseId = fallbackWarehouseId;
        }
      } else {
        warehouseId = warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
      }
    } catch (error) {
      console.warn("[export-to-base] Failed to verify warehouse, skipping stock export", {
        warehouseId,
        inventoryId: resolvedInventoryId,
        error,
      });
      validWarehouseIds = null;
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

    let effectiveMappings = filterStockMappings(mappings);

    // Export to Base.com
    console.log("[export-to-base] Calling Base.com API", {
      productId,
      inventoryId: resolvedInventoryId,
      mappingsCount: effectiveMappings.length,
    });

    const buildExportSnapshot = (
      targetWarehouseId: string | null,
      activeMappings: typeof mappings = effectiveMappings,
      includeStockWithoutWarehouse = false
    ) => {
      const exportData = buildBaseProductData(
        product,
        activeMappings,
        targetWarehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          stockWarehouseAliases: stockWarehouseAliases ?? undefined,
        }
      ) as Record<string, unknown> & {
        text_fields?: Record<string, unknown>;
        prices?: Record<string, unknown>;
        stock?: Record<string, unknown>;
      };
      const exportFields = Object.keys(exportData).flatMap((key) => {
        if (key === "text_fields" && exportData.text_fields && typeof exportData.text_fields === "object") {
          return Object.keys(exportData.text_fields as Record<string, unknown>).map((field) => `text_fields.${field}`);
        }
        if (key === "prices" && exportData.prices && typeof exportData.prices === "object") {
          return Object.keys(exportData.prices as Record<string, unknown>).map((field) => `prices.${field}`);
        }
        if (key === "stock" && exportData.stock && typeof exportData.stock === "object") {
          return Object.keys(exportData.stock as Record<string, unknown>).map((field) => `stock.${field}`);
        }
        return [key];
      });
      return { exportData, exportFields };
    };

    const allowStockFallback = await getExportStockFallbackEnabled();
    let includeStockWithoutWarehouse =
      !warehouseId && product.stock !== null;
    let { exportFields } = buildExportSnapshot(
      warehouseId,
      effectiveMappings,
      includeStockWithoutWarehouse
    );
    let result = await exportProductToBase(
      token,
      resolvedInventoryId,
      product,
      effectiveMappings,
      warehouseId,
      {
        imageBaseUrl,
        includeStockWithoutWarehouse,
        stockWarehouseAliases: stockWarehouseAliases ?? undefined,
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

    const warehouseMismatch = isWarehouseMismatch(result.error);

    if (!result.success && warehouseMismatch && allowStockFallback) {
      console.warn("[export-to-base] Warehouse mismatch, retrying without stock", {
        productId,
        inventoryId: resolvedInventoryId,
        warehouseId,
        error: result.error,
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping.sourceKey.trim().toLowerCase().startsWith("stock")
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        resolvedInventoryId,
        product,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          stockWarehouseAliases: stockWarehouseAliases ?? undefined,
        }
      );
    } else if (!result.success && warehouseMismatch) {
      console.warn("[export-to-base] Warehouse mismatch, failing export", {
        productId,
        inventoryId: resolvedInventoryId,
        warehouseId,
        error: result.error,
      });
    }

    if (
      !result.success &&
      !warehouseMismatch &&
      includeStockWithoutWarehouse &&
      isStockMismatch(result.error)
    ) {
      console.warn("[export-to-base] Retrying without stock export", {
        productId,
        inventoryId: resolvedInventoryId,
        warehouseId,
        error: result.error,
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping.sourceKey.trim().toLowerCase().startsWith("stock")
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        resolvedInventoryId,
        product,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          stockWarehouseAliases: stockWarehouseAliases ?? undefined,
        }
      );
    }

    if (!result.success) {
      console.error("[export-to-base] Export failed", {
        productId,
        error: result.error,
      });
      if (listingId) {
        await listingRepo.updateListingStatus(listingId, "failed");
        await listingRepo.appendExportHistory(listingId, {
          exportedAt: new Date(),
          status: "failed",
          inventoryId: resolvedInventoryId,
          templateId: data.templateId ?? null,
          warehouseId,
          externalListingId: result.productId || null,
          fields: exportFields,
        });
      }
      return NextResponse.json(
        { error: result.error || "Failed to export product" },
        { status: 500 }
      );
    }

    console.log("[export-to-base] Export successful", {
      productId,
      externalProductId: result.productId,
    });

    if (listingId) {
      if (result.productId) {
        await listingRepo.updateListingExternalId(listingId, result.productId);
      }
      await listingRepo.updateListingStatus(listingId, "active");
      await listingRepo.appendExportHistory(listingId, {
        exportedAt: new Date(),
        status: "success",
        inventoryId: resolvedInventoryId,
        templateId: data.templateId ?? null,
        warehouseId,
        externalListingId: result.productId || null,
        fields: exportFields,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Product successfully exported to Base.com",
      externalProductId: result.productId,
    });
  } catch (error) {
    console.error("Failed to export product to Base.com:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export product to Base.com" },
      { status: 500 }
    );
  }
}
