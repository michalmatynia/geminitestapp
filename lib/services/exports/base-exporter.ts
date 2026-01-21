import type { ProductWithImages } from "@/types";
import type { BaseProductRecord } from "@/lib/services/imports/base-client";
import { callBaseApi } from "@/lib/services/imports/base-client";

type ExportTemplateMapping = {
  sourceKey: string;  // Internal product field
  targetField: string;  // Base.com API parameter name
};

const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  "";

const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value);
const resolveImageUrl = (value: string | null | undefined, baseUrl?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (hasScheme(trimmed)) return trimmed;
  const baseCandidate = baseUrl ?? IMAGE_BASE_URL;
  if (!baseCandidate) return trimmed;
  const base = baseCandidate.replace(/\/+$/, "");
  const path = trimmed.replace(/^\/+/, "");
  return `${base}/${path}`;
};

const IMAGE_TARGET_FIELDS = new Set([
  "images",
  "image",
  "image_urls",
  "images_url",
  "images_urls",
  "images_link_all",
  "image_links_all",
]);

const IMAGE_EXPORT_ALIASES = new Set([
  "image_all",
  "images_all",
  "image_slots_all",
  "image_slots",
  "image_files",
  "image_links_all",
  "image_links",
  "images_link_all",
  "image_link_all",
]);

const normalizeExportTargetField = (targetField: string) => {
  const trimmed = targetField.trim();
  const normalized = trimmed.toLowerCase();
  if (IMAGE_EXPORT_ALIASES.has(normalized)) {
    return "images";
  }
  return trimmed;
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

const getImageSlotUrl = (
  product: ProductWithImages,
  index: number,
  mode: "slot" | "file" | "link",
  imageBaseUrl?: string | null
) => {
  if (index < 0) return null;
  if (mode !== "link") {
    const imageFile = product.images?.[index]?.imageFile?.filepath;
    const resolved = resolveImageUrl(imageFile, imageBaseUrl);
    if (resolved) return resolved;
  }
  const link = product.imageLinks?.[index];
  const resolved = resolveImageUrl(
    typeof link === "string" ? link : null,
    imageBaseUrl
  );
  if (resolved) return resolved;
  return null;
};

const getImageList = (
  product: ProductWithImages,
  mode: "slot" | "file" | "link",
  imageBaseUrl?: string | null
) => {
  if (mode === "link") {
    return (product.imageLinks ?? [])
      .map(
        (link) =>
          resolveImageUrl(typeof link === "string" ? link : null, imageBaseUrl) ??
          ""
      )
      .filter(Boolean);
  }
  const slots = (product.images ?? [])
    .map((entry) => resolveImageUrl(entry.imageFile?.filepath, imageBaseUrl) ?? "")
    .filter(Boolean);
  return slots;
};

const getAllImageUrls = (product: ProductWithImages, imageBaseUrl?: string | null) => {
  const slots = getImageList(product, "slot", imageBaseUrl);
  const links = getImageList(product, "link", imageBaseUrl);
  return Array.from(new Set([...slots, ...links]));
};

/**
 * Get value from product using a dot-notation path or direct field access
 */
const getProductValue = (
  product: ProductWithImages,
  sourceKey: string,
  imageBaseUrl?: string | null
): unknown => {
  if (!sourceKey) return null;

  const normalized = sourceKey.trim().toLowerCase();
  const slotMatch = normalized.match(/^image_(slot|file|link)_(\d+)$/);
  if (slotMatch) {
    const index = Number.parseInt(slotMatch[2] ?? "", 10) - 1;
    if (Number.isNaN(index)) return null;
    const mode = slotMatch[1] as "slot" | "file" | "link";
    return getImageSlotUrl(product, index, mode, imageBaseUrl);
  }
  const imageMatch = normalized.match(/^image_(\d+)$/);
  if (imageMatch) {
    const index = Number.parseInt(imageMatch[1] ?? "", 10) - 1;
    if (Number.isNaN(index)) return null;
    return getImageSlotUrl(product, index, "slot", imageBaseUrl);
  }
  if (
    normalized === "image_all" ||
    normalized === "image_slots" ||
    normalized === "image_files" ||
    normalized === "image_slots_all"
  ) {
    return getImageList(product, "slot", imageBaseUrl);
  }
  if (normalized === "image_links" || normalized === "image_links_all") {
    return getImageList(product, "link", imageBaseUrl);
  }
  if (normalized === "images_all") {
    return getAllImageUrls(product, imageBaseUrl);
  }
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
  mappings: ExportTemplateMapping[],
  imageBaseUrl?: string | null
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();

    if (!sourceKey || !targetField) continue;

    const rawValue = getProductValue(product, sourceKey, imageBaseUrl);
    if (rawValue === null || rawValue === undefined) continue;

    const targetKey = targetField.toLowerCase();
    const isImageTarget = IMAGE_TARGET_FIELDS.has(targetKey);

    if (isImageTarget) {
      if (Array.isArray(rawValue)) {
        const urls = rawValue
          .map((entry) =>
            typeof entry === "string" ? resolveImageUrl(entry, imageBaseUrl) ?? "" : ""
          )
          .filter(Boolean);
        if (urls.length > 0) {
          result[targetField] = urls;
        }
        continue;
      }
      if (typeof rawValue === "string") {
        const resolved = resolveImageUrl(rawValue, imageBaseUrl);
        if (resolved) {
          result[targetField] = [resolved];
        }
      }
      continue;
    }

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
  warehouseId?: string | null,
  options?: { imageBaseUrl?: string | null }
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
    // Templates are saved as Base -> product mappings, so invert for export.
    const exportMappings = mappings.map((mapping) => ({
      sourceKey: mapping.targetField,
      targetField: normalizeExportTargetField(mapping.sourceKey),
    }));
    const templateData = applyExportTemplateMappings(
      product,
      exportMappings,
      options?.imageBaseUrl ?? null
    );
    const templateStock = templateData.stock;
    if (templateStock !== undefined) {
      const hasWarehouse = Boolean(warehouseId);
      const baseStock = baseData.stock ?? null;
      if (typeof templateStock === "string" || typeof templateStock === "number") {
        const numeric = Number(templateStock);
        if (hasWarehouse && Number.isFinite(numeric)) {
          templateData.stock = {
            ...((baseStock as Record<string, number>) ?? {}),
            [warehouseId as string]: numeric,
          };
        } else if (baseStock) {
          delete templateData.stock;
        }
      } else if (
        templateStock &&
        typeof templateStock === "object" &&
        !Array.isArray(templateStock)
      ) {
        templateData.stock = {
          ...(templateStock as Record<string, unknown>),
          ...((baseStock as Record<string, number>) ?? {}),
        };
      } else if (baseStock) {
        delete templateData.stock;
      }
    }
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
  warehouseId?: string | null,
  options?: { imageBaseUrl?: string | null }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = buildBaseProductData(product, mappings, warehouseId, options);

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
