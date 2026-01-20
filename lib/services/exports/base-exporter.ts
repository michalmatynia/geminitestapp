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
 */
export function buildBaseProductData(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = []
): BaseProductRecord {
  // Start with default field mappings
  const baseData: BaseProductRecord = {};

  // Map standard fields
  if (product.sku) baseData.sku = product.sku;
  if (product.name_en) baseData.name = product.name_en;
  if (product.description_en) baseData.description = product.description_en;
  if (product.price !== null) baseData.price_brutto = product.price;
  if (product.stock !== null) baseData.stock = product.stock;
  if (product.ean) baseData.ean = product.ean;
  if (product.weight !== null) baseData.weight = product.weight;

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
  mappings: ExportTemplateMapping[] = []
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = buildBaseProductData(product, mappings);

    // Use Base.com API method to add product to inventory
    const response = await callBaseApi(token, "addInventoryProduct", {
      inventory_id: inventoryId,
      products: [productData],
    });

    // Extract product ID from response
    // Base.com API typically returns { status: "SUCCESS", products: [...] }
    const products = response.products || [];
    const createdProduct = Array.isArray(products) ? products[0] : null;
    const productId =
      createdProduct && typeof createdProduct === "object"
        ? String((createdProduct as Record<string, unknown>).product_id || "")
        : null;

    return {
      success: true,
      ...(productId ? { productId } : {}),
    };
  } catch (error) {
    console.error("Failed to export product to Base.com:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
