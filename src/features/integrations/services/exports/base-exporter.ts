import 'server-only';

import { callBaseApi } from '@/features/integrations/services/imports/base-client';
import type {
  ImportExportTemplateMapping as ExportTemplateMapping,
  BaseProductRecord,
  ImageExportDiagnostics,
  ImageUrlDiagnostic,
} from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getAllImageUrls, getProductImagesAsBase64 } from './base-exporter-images';
import {
  applyExportTemplateMappings,
  toNumberValue,
  toStringValue,
} from './base-exporter-template-mappings';
import { getLookupEntries } from './base-exporter/lookup-resolvers';
import { getProductProducerValues } from './base-exporter/product-resolvers';
import { normalizeProducerTargetField } from './base-exporter/template-helpers';

import type {
  ImageBase64Mode,
  ImageExportLogger,
  ImageTransformOptions,
} from './base-exporter-images';

export {
  collectProductImageDiagnostics,
  getProductImagesAsBase64,
  resolveImageUrl,
} from './base-exporter-images';
export type {
  ImageBase64Mode,
  ImageExportLogger,
  ImageTransformOptions,
} from './base-exporter-images';
export type { ImageExportDiagnostics, ImageUrlDiagnostic };

const IMAGE_EXPORT_ALIASES = new Set(['images_all', 'image_slots_all', 'image_links_all']);

const normalizeExportTargetField = (targetField: string): string => {
  const trimmed = targetField.trim();
  const normalized = trimmed.toLowerCase();
  if (IMAGE_EXPORT_ALIASES.has(normalized)) {
    return 'images';
  }
  if (normalized === 'category' || normalized === 'categoryid') {
    return 'category_id';
  }
  if (normalized === 'eans') {
    return 'ean';
  }
  if (normalized === 'weightkg' || normalized === 'weight_kg') {
    return 'weight';
  }
  if (normalized === 'lengthcm' || normalized === 'length_cm') {
    return 'length';
  }
  if (normalized === 'widthcm' || normalized === 'width_cm') {
    return 'width';
  }
  if (normalized === 'heightcm' || normalized === 'height_cm') {
    return 'height';
  }
  if (normalized === 'producerid') {
    return 'producer_id';
  }
  if (normalized === 'producerids') {
    return 'producer_ids';
  }
  if (
    normalized === 'producers' ||
    normalized === 'producernames' ||
    normalized === 'producer_names' ||
    normalized === 'producername' ||
    normalized === 'producer_name'
  ) {
    return 'producer_ids';
  }
  if (
    normalized === 'producer' ||
    normalized === 'manufacturer' ||
    normalized === 'manufacturerid' ||
    normalized === 'manufacturer_id'
  ) {
    return 'producer_id';
  }
  if (normalized === 'manufacturerids' || normalized === 'manufacturer_ids') {
    return 'producer_ids';
  }
  if (normalized === 'tagid') {
    return 'tag_id';
  }
  if (normalized === 'tagids') {
    return 'tag_ids';
  }
  return trimmed;
};

export const normalizeStockKey = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const typedMatch = trimmed.match(/([a-z]+)[_-]?(\d+)/i);
  if (typedMatch?.[1] && typedMatch?.[2]) {
    const prefix = typedMatch[1].toLowerCase();
    return `${prefix}_${typedMatch[2]}`;
  }
  const match = trimmed.match(/(\d+)/);
  if (match?.[1]) return match[1];
  return null;
};

const mergeTextFields = (
  baseData: BaseProductRecord,
  templateData: Record<string, unknown>
): void => {
  const nextTextFields: Record<string, unknown> = {};

  const setNestedValue = (target: Record<string, unknown>, path: string, value: string): void => {
    const parts = path
      .split('.')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) return;

    if (parts.length === 1) {
      target[parts[0] as string] = value;
      return;
    }

    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const segment = parts[index] as string;
      const existing = cursor[segment];
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1] as string;
    cursor[leaf] = value;
  };

  const pushValue = (key: string, value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue || value === '') {
        setNestedValue(nextTextFields, key, trimmedValue);
      }
      return;
    }
    const stringValue = toStringValue(value);
    if (!stringValue) return;
    setNestedValue(nextTextFields, key, stringValue);
  };

  if (
    templateData['text_fields'] &&
    typeof templateData['text_fields'] === 'object' &&
    !Array.isArray(templateData['text_fields'])
  ) {
    for (const [key, value] of Object.entries(
      templateData['text_fields'] as Record<string, unknown>
    )) {
      const trimmedKey = key.trim();
      if (!trimmedKey) continue;
      pushValue(trimmedKey, value);
    }
    delete templateData['text_fields'];
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    const lowered = trimmedKey.toLowerCase();
    if (lowered.startsWith('text_fields.')) {
      const fieldKey = trimmedKey.slice('text_fields.'.length);
      if (fieldKey) {
        pushValue(fieldKey, value);
      }
      delete templateData[key];
      continue;
    }
    if (lowered === 'name' || lowered === 'description') {
      pushValue(trimmedKey, value);
      delete templateData[key];
      continue;
    }
    if (lowered.startsWith('name|') || lowered.startsWith('description|')) {
      pushValue(trimmedKey, value);
      delete templateData[key];
    }
  }

  if (Object.keys(nextTextFields).length === 0) return;

  const baseTextFields =
    baseData['text_fields'] && typeof baseData['text_fields'] === 'object'
      ? (baseData['text_fields'] as Record<string, unknown>)
      : {};

  baseData['text_fields'] = {
    ...baseTextFields,
    ...nextTextFields,
  };
};

const mergeNumericFields = (
  templateData: Record<string, unknown>,
  fieldName: 'prices' | 'stock',
  normalizeKey?: (value: string) => string | null
): void => {
  const nextEntries: Record<string, number> = {};

  const existing = templateData[fieldName];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    for (const [key, value] of Object.entries(existing as Record<string, unknown>)) {
      const normalized = normalizeKey ? normalizeKey(key) : key.trim();
      if (!normalized) continue;
      const numeric = toNumberValue(value);
      if (numeric !== null) {
        nextEntries[normalized] = numeric;
      }
    }
  }

  for (const [key, value] of Object.entries(templateData)) {
    const trimmedKey = key.trim();
    const lowered = trimmedKey.toLowerCase();
    if (!lowered.startsWith(`${fieldName}.`)) continue;
    const suffix = trimmedKey.slice(fieldName.length + 1);
    if (!suffix) {
      delete templateData[key];
      continue;
    }
    const normalized = normalizeKey ? normalizeKey(suffix) : suffix.trim();
    if (!normalized) {
      delete templateData[key];
      continue;
    }
    const numeric = toNumberValue(value);
    if (numeric !== null) {
      nextEntries[normalized] = numeric;
    }
    delete templateData[key];
  }

  if (Object.keys(nextEntries).length > 0) {
    templateData[fieldName] = nextEntries;
  }
};

const hasExplicitProducerTemplateMapping = (mappings: ExportTemplateMapping[]): boolean =>
  mappings.some((mapping: ExportTemplateMapping) =>
    normalizeProducerTargetField(String(mapping.sourceKey ?? '')) !== null
  );

const hasResolvedProducerExportValue = (data: Record<string, unknown>): boolean => {
  const hasValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
      return value.some((entry: unknown) => hasValue(entry));
    }
    return false;
  };

  return hasValue(data['producer_id']) || hasValue(data['producer_ids']);
};

const applyDefaultMappedProducerIds = (
  data: BaseProductRecord,
  mappedProducerIds: string[]
): void => {
  if (mappedProducerIds.length === 1) {
    data['producer_id'] = mappedProducerIds[0];
    delete data['producer_ids'];
    return;
  }

  if (mappedProducerIds.length > 1) {
    data['producer_ids'] = mappedProducerIds;
    delete data['producer_id'];
  }
};

const resolveDefaultMappedProducerIds = (
  product: ProductWithImages,
  producerExternalIdByInternalId?: Record<string, string>
): string[] => {
  if (!producerExternalIdByInternalId) {
    return [];
  }

  const externalProducerIds = new Set(
    getLookupEntries(producerExternalIdByInternalId).map(([, externalId]) => externalId.toLowerCase())
  );
  if (externalProducerIds.size === 0) {
    return [];
  }

  const { producerIds } = getProductProducerValues(
    product,
    undefined,
    producerExternalIdByInternalId
  );

  return producerIds.filter((producerId: string) => externalProducerIds.has(producerId.toLowerCase()));
};

/**
 * Build Base.com product data from internal product
 * Applies default mapping + optional template mappings
 * Returns data in Baselinker API format
 */
export async function buildBaseProductData(
  product: ProductWithImages,
  mappings: ExportTemplateMapping[] = [],
  warehouseId?: string | null,
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    producerNameById?: Record<string, string>;
    producerExternalIdByInternalId?: Record<string, string>;
    tagNameById?: Record<string, string>;
    tagExternalIdByInternalId?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportLogger | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
    concurrencyLimit?: number | undefined;
    signal?: AbortSignal | undefined;
    cachedImages?: Record<string, string> | undefined;
  }
): Promise<BaseProductRecord> {
  // Start with default field mappings in Baselinker API format
  const baseData: BaseProductRecord = {};

  // SKU is required
  if (product.sku) baseData['sku'] = product.sku;

  const imagesOnly = options?.imagesOnly ?? false;

  // EAN (optional)
  if (!imagesOnly && product.ean) baseData['ean'] = product.ean;

  // Weight (optional)
  if (!imagesOnly && product.weight !== null) baseData['weight'] = product.weight;

  // Text fields (name, description, etc.) go in text_fields object
  if (!imagesOnly) {
    const categoryId = typeof product.categoryId === 'string' ? product.categoryId.trim() : '';
    const textFields: Record<string, string> = {};
    const mappedProducerIds = resolveDefaultMappedProducerIds(
      product,
      options?.producerExternalIdByInternalId
    );
    if (product.name_en) textFields['name'] = product.name_en;
    if (product.description_en) textFields['description'] = product.description_en;
    if (categoryId) baseData['category_id'] = categoryId;
    applyDefaultMappedProducerIds(baseData, mappedProducerIds);
    if (Object.keys(textFields).length > 0) {
      baseData['text_fields'] = textFields;
    }
  }

  // Prices need to be in format: { "price_group_id": price_value }
  // Using a default price group - this may need configuration
  if (!imagesOnly && product.price !== null) {
    baseData['prices'] = { '0': product.price };
  }

  // Stock needs to be in format: { "warehouse_id": quantity }
  if (!imagesOnly && product.stock !== null) {
    if (warehouseId) {
      baseData['stock'] = { [warehouseId]: product.stock };
    } else if (options?.includeStockWithoutWarehouse) {
      baseData['stock'] = product.stock;
    }
  }

  // Handle images - export as base64 data URIs if requested
  if (options?.exportImagesAsBase64) {
    const base64Images = await getProductImagesAsBase64(product, {
      diagnostics: options.imageDiagnostics,
      outputMode: options.imageBase64Mode,
      transform: options.imageTransform ?? null,
      concurrencyLimit: options.concurrencyLimit,
      signal: options.signal,
      cachedImages: options.cachedImages,
    });
    if (Object.keys(base64Images).length > 0) {
      baseData['images'] = base64Images;
    }
  } else {
    const urlImages = getAllImageUrls(
      product,
      options?.imageBaseUrl ?? null,
      options?.imageDiagnostics
    );
    if (urlImages.length > 0) {
      baseData['images'] = urlImages;
    }
  }

  // Apply template mappings (these override defaults)
  if (!imagesOnly && mappings.length > 0) {
    const explicitProducerTemplateMapping = hasExplicitProducerTemplateMapping(mappings);
    const mappedProducerIds = resolveDefaultMappedProducerIds(
      product,
      options?.producerExternalIdByInternalId
    );
    // Templates are saved as Base -> product mappings, so invert for export.
    const exportMappings = mappings.map((mapping: ExportTemplateMapping) => ({
      sourceKey: mapping.targetField,
      targetField: normalizeExportTargetField(mapping.sourceKey),
    }));
    const templateData = applyExportTemplateMappings(product, exportMappings, {
      imageBaseUrl: options?.imageBaseUrl ?? null,
      diagnostics: options?.imageDiagnostics,
      producerNameById: options?.producerNameById ?? null,
      producerExternalIdByInternalId: options?.producerExternalIdByInternalId ?? null,
      tagNameById: options?.tagNameById ?? null,
      tagExternalIdByInternalId: options?.tagExternalIdByInternalId ?? null,
    });
    mergeTextFields(baseData, templateData);
    mergeNumericFields(templateData, 'prices');
    const stockAliases = options?.stockWarehouseAliases ?? null;
    const normalizeStockKeyWithAliases = (value: string): string | null => {
      const normalized = normalizeStockKey(value);
      if (!normalized) return null;
      return stockAliases?.[normalized] ?? normalized;
    };
    mergeNumericFields(templateData, 'stock', normalizeStockKeyWithAliases);
    const templateStock = templateData['stock'];
    if (templateStock !== undefined) {
      const hasWarehouse = Boolean(warehouseId);
      const baseStock = baseData['stock'] ?? null;
      if (typeof templateStock === 'string' || typeof templateStock === 'number') {
        const numeric = Number(templateStock);
        if (hasWarehouse && Number.isFinite(numeric)) {
          templateData['stock'] = {
            ...((baseStock as Record<string, number>) ?? {}),
            [warehouseId as string]: numeric,
          };
        } else if (baseStock) {
          delete templateData['stock'];
        }
      } else if (
        templateStock &&
        typeof templateStock === 'object' &&
        !Array.isArray(templateStock)
      ) {
        templateData['stock'] = {
          ...(templateStock as Record<string, unknown>),
          ...((baseStock as Record<string, number>) ?? {}),
        };
        if (stockAliases) {
          const nextStock = templateData['stock'] as Record<string, unknown>;
          for (const [key, value] of Object.entries(nextStock)) {
            const normalized = normalizeStockKey(key);
            if (!normalized) continue;
            const aliased = stockAliases[normalized];
            if (!aliased || aliased === key) continue;
            if (nextStock[aliased] === undefined) {
              nextStock[aliased] = value;
            }
            delete nextStock[key];
          }
        }
      } else if (baseStock) {
        delete templateData['stock'];
      }
    }

    // If exporting images as base64, don't let template mappings override them
    if (options?.exportImagesAsBase64 && baseData['images']) {
      delete templateData['images'];
    }

    Object.assign(baseData, templateData);

    if (
      explicitProducerTemplateMapping &&
      mappedProducerIds.length > 0 &&
      !hasResolvedProducerExportValue(baseData)
    ) {
      applyDefaultMappedProducerIds(baseData, mappedProducerIds);
    }
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
  options?: {
    imageBaseUrl?: string | null;
    includeStockWithoutWarehouse?: boolean;
    stockWarehouseAliases?: Record<string, string>;
    producerNameById?: Record<string, string>;
    producerExternalIdByInternalId?: Record<string, string>;
    tagNameById?: Record<string, string>;
    tagExternalIdByInternalId?: Record<string, string>;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportLogger | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
    imagesOnly?: boolean;
    /** When set, the export updates this existing Base.com product (product_id) instead of creating a new one. */
    existingProductId?: string | null;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, mappings, warehouseId, options);

    // Build API parameters - inventory_id + all product fields as top-level params
    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      ...productData,
    };

    // When updating an existing product, include product_id so Base.com updates rather than creates.
    const resolvedExistingId = options?.existingProductId?.trim() || null;
    if (resolvedExistingId) {
      apiParams['product_id'] = resolvedExistingId;
    }

    const response = await callBaseApi(token, 'addInventoryProduct', apiParams);

    // Extract product ID from response
    // Baselinker API returns { status: "SUCCESS", product_id: "..." }
    const productIdValue = response['product_id'];
    const productId =
      typeof productIdValue === 'string' || typeof productIdValue === 'number'
        ? String(productIdValue)
        : null;

    return {
      success: true,
      ...(productId ? { productId } : {}),
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'base-exporter',
      action: 'exportProductToBase',
      productId: product.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportProductImagesToBase(
  token: string,
  inventoryId: string,
  product: ProductWithImages,
  externalProductId: string,
  options?: {
    imageBaseUrl?: string | null;
    exportImagesAsBase64?: boolean | undefined;
    imageDiagnostics?: ImageExportLogger | undefined;
    imageBase64Mode?: ImageBase64Mode | undefined;
    imageTransform?: ImageTransformOptions | null;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productData = await buildBaseProductData(product, [], null, {
      imageBaseUrl: options?.imageBaseUrl ?? null,
      ...(options?.exportImagesAsBase64 !== undefined
        ? { exportImagesAsBase64: options.exportImagesAsBase64 }
        : {}),
      ...(options?.imageDiagnostics ? { imageDiagnostics: options.imageDiagnostics } : {}),
      ...(options?.imageBase64Mode ? { imageBase64Mode: options.imageBase64Mode } : {}),
      imageTransform: options?.imageTransform ?? null,
      imagesOnly: true,
    });

    const apiParams: Record<string, unknown> = {
      inventory_id: inventoryId,
      product_id: externalProductId,
      ...productData,
    };

    // Base updates existing inventory products via addInventoryProduct when product_id is provided.
    const response = await callBaseApi(token, 'addInventoryProduct', apiParams);
    const productIdValue = response['product_id'];
    const productId =
      typeof productIdValue === 'string' || typeof productIdValue === 'number'
        ? String(productIdValue)
        : externalProductId;

    return {
      success: true,
      productId,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'base-exporter',
      action: 'exportProductImagesToBase',
      productId: product.id,
      externalProductId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
