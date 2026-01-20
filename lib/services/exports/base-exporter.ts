import type { ProductWithImages } from "@/types";
import type { BaseProductRecord } from "@/lib/services/imports/base-client";
import { callBaseApi } from "@/lib/services/imports/base-client";

type ExportTemplateMapping = {
  sourceKey: string;  // Internal product field
  targetField: string;  // Base.com API parameter name
};

const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => toStringValue(entry))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

/**
 * Get value from product using a dot-notation path or direct field access
 */
const getProductValue = (
  product: ProductWithImages,
  sourceKey: string
): unknown => {
  if (!sourceKey) return null;

  // Handle dot notation for nested access
  if (sourceKey.includes(".")) {
    const path = sourceKey.split(".").map((part) => part.trim());
    let current: unknown = product;
    for (const key of path) {
      if (!current || typeof current !== "object") return null;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  // Direct field access
  return (product as Record<string, unknown>)[sourceKey];
};

/**
 * Apply export template mappings to convert internal product fields to Base.com format
 */
function applyExportTemplateMappings(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();

    if (!sourceKey || !targetField) continue;

    const rawValue = getProductValue(product, sourceKey);
    if (rawValue === null || rawValue === undefined) continue;

    // Try to convert to string first
    const stringValue = toStringValue(rawValue);
    if (stringValue) {
      result[targetField] = stringValue;
      continue;
    }

    // Try number conversion
    const numberValue = toNumberValue(rawValue);
    if (numberValue !== null) {
      result[targetField] = numberValue;
    }
  }

  return result;
}

/**
 * Build Base.com product data from internal product
 * Applies default mapping + optional template mappings
 * Returns data in Baselinker API format
 */
export function buildBaseProductData(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null
): BaseProductRecord {
  // Start with default field mappings in Baselinker API format
  const baseData: BaseProductRecord = {};

  // SKU is required
  if (product.sku) baseData.sku = product.sku;

  // EAN (optional)
  if (product.ean) baseData.ean = product.ean;

  // Weight (optional)
  if (product.weight !== null) baseData.weight = product.weight;

  // Text fields (name, description, etc.) go in text_fields object
  const textFields: Record<string, string> = {};
  if (product.name_en) textFields.name = product.name_en;
  if (product.description_en) textFields.description = product.description_en;
  if (Object.keys(textFields).length > 0) {
    baseData.text_fields = textFields;
  }

  // Prices need to be in format: { "price_group_id": price_value }
  // Using a default price group - this may need configuration
  if (product.price !== null) {
    baseData.prices = { "0": product.price };
  }

  // Stock needs to be in format: { "warehouse_id": quantity }
  if (product.stock !== null && warehouseId) {
    baseData.stock = { [warehouseId]: product.stock };
  }

  // Apply template mappings (these override defaults)
  if (mappings.length > 0) {
    const templateData = applyExportTemplateMappings(product, mappings);
    Object.assign(baseData, templateData);
  }

  return baseData;
}

/**
 * Export a product to Base.com inventory
 */
export async function exportProductToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = buildBaseProductData(product, mappings, warehouseId);

    console.log("[base-exporter] Built product data for export", {
      productId: product.id,
      sku: productData.sku,
      hasTextFields: Boolean(productData.text_fields),
      hasPrices: Boolean(productData.prices),
      hasStock: Boolean(productData.stock),
      fieldCount: Object.keys(productData).length,
    });

    // Build API parameters - inventory_id + all product fields as top-level params
    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      ...productData,
    };

    console.log("[base-exporter] Sending to Base.com API", {
      method: "addInventoryProduct",
      inventoryId,
      params: apiParams,
    });

    const response = await callBaseApi(token, "addInventoryProduct", apiParams);

    console.log("[base-exporter] Base.com API response", {
      status: response.status,
      productId: response.product_id,
      response,
    });

    // Extract product ID from response
    // Baselinker API returns { status: "SUCCESS", product_id: "..." }
    const productId = response.product_id
      ? String(response.product_id)
      : null;

    console.log("[base-exporter] Export completed", {
      success: true,
      externalProductId: productId,
    });

    return {
      success: true,
      ...(productId ? { productId } : {}),
    };
  } catch (error) {
    console.error("[base-exporter] Export failed", {
      productId: product.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
