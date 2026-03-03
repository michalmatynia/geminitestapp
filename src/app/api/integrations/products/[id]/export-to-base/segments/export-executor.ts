import {
  buildBaseProductData,
  exportProductImagesToBase,
  exportProductToBase,
  getExportStockFallbackEnabled,
} from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ProductWithImagesDto as ProductWithImages } from '@/features/products/server';
import type { BaseFieldMapping } from '../helpers';

type BuildBaseProductDataOptions = NonNullable<Parameters<typeof buildBaseProductData>[3]>;
type ExportProductToBaseOptions = NonNullable<Parameters<typeof exportProductToBase>[5]>;
type ExportProductImagesToBaseOptions = NonNullable<Parameters<typeof exportProductImagesToBase>[4]>;
type ExportMappings = NonNullable<Parameters<typeof buildBaseProductData>[1]>;
type ExportResult = Awaited<ReturnType<typeof exportProductToBase>>;
type BaseExportPayload = Awaited<ReturnType<typeof buildBaseProductData>>;
type StockWarehouseAliases = BuildBaseProductDataOptions['stockWarehouseAliases'];
type IdNameMap = BuildBaseProductDataOptions['producerNameById'];
type IdExternalIdMap = BuildBaseProductDataOptions['producerExternalIdByInternalId'];
type ImageDiagnosticsLogger = BuildBaseProductDataOptions['imageDiagnostics'];
type ImageBase64Mode = NonNullable<BuildBaseProductDataOptions['imageBase64Mode']>;
type ImageTransformOptions = BuildBaseProductDataOptions['imageTransform'];
type MinimalExportProduct = Pick<ProductWithImages, 'id' | 'stock'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasWarehouseMismatch = (message: string | undefined): boolean =>
  typeof message === 'string' &&
  message.toLowerCase().includes('warehouse') &&
  message.toLowerCase().includes('not included');

const hasStockMismatch = (message: string | undefined): boolean =>
  typeof message === 'string' &&
  (message.toLowerCase().includes('stock') || message.toLowerCase().includes('quantity'));

const collectExportFields = (exportData: BaseExportPayload): string[] =>
  Object.keys(exportData).flatMap((key) => {
    const value = exportData[key];
    if (key === 'text_fields' && isRecord(value)) {
      return Object.keys(value).map((field) => `text_fields.${field}`);
    }
    if (key === 'prices' && isRecord(value)) {
      return Object.keys(value).map((field) => `prices.${field}`);
    }
    if (key === 'stock' && isRecord(value)) {
      return Object.keys(value).map((field) => `stock.${field}`);
    }
    return [key];
  });

const withoutStockMappings = (mappings: ExportMappings): ExportMappings =>
  mappings.filter((mapping: BaseFieldMapping) => !mapping.sourceKey.trim().toLowerCase().startsWith('stock'));

export async function executeBaseExport(args: {
  imagesOnly: boolean;
  token: string;
  targetInventoryId: string;
  exportProduct: ProductWithImages;
  effectiveMappings: ExportMappings;
  warehouseId: string | null;
  listingExternalId: string | null;
  imageBaseUrl: string;
  stockWarehouseAliases: StockWarehouseAliases;
  producerNameById: IdNameMap;
  producerExternalIdByInternalId: IdExternalIdMap;
  tagNameById: IdNameMap;
  tagExternalIdByInternalId: IdExternalIdMap;
  exportImagesAsBase64: boolean;
  imageBase64Mode: ImageBase64Mode;
  imageTransform: ImageTransformOptions;
  baseImageDiagnostics: ImageDiagnosticsLogger;
  product: MinimalExportProduct;
  canRetryWrite: boolean;
}) {
  const {
    imagesOnly,
    token,
    targetInventoryId,
    exportProduct,
    listingExternalId,
    imageBaseUrl,
    stockWarehouseAliases,
    producerNameById,
    producerExternalIdByInternalId,
    tagNameById,
    tagExternalIdByInternalId,
    baseImageDiagnostics,
    product,
    canRetryWrite,
  } = args;
  let { effectiveMappings, warehouseId, exportImagesAsBase64, imageBase64Mode, imageTransform } = args;

  const buildSharedOptions = (includeStockWithoutWarehouse: boolean): BuildBaseProductDataOptions => ({
    imageBaseUrl,
    includeStockWithoutWarehouse,
    ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
    ...(producerNameById ? { producerNameById } : {}),
    ...(producerExternalIdByInternalId ? { producerExternalIdByInternalId } : {}),
    ...(tagNameById ? { tagNameById } : {}),
    ...(tagExternalIdByInternalId ? { tagExternalIdByInternalId } : {}),
    exportImagesAsBase64,
    imageBase64Mode,
    imageTransform,
    imagesOnly,
  });

  const buildExportOptions = (
    includeStockWithoutWarehouse: boolean
  ): ExportProductToBaseOptions => ({
    ...buildSharedOptions(includeStockWithoutWarehouse),
    ...(listingExternalId ? { existingProductId: listingExternalId } : {}),
  });

  const buildImageExportOptions = (): ExportProductImagesToBaseOptions => ({
    imageBaseUrl,
    exportImagesAsBase64,
    ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
    imageBase64Mode,
    imageTransform,
  });

  const buildExportSnapshot = async (
    targetWarehouseId: string | null,
    activeMappings: ExportMappings = effectiveMappings,
    includeStockWithoutWarehouse = false
  ): Promise<{ exportData: BaseExportPayload; exportFields: string[] }> => {
    const exportData = await buildBaseProductData(
      exportProduct,
      activeMappings,
      targetWarehouseId,
      buildSharedOptions(includeStockWithoutWarehouse)
    );
    const exportFields = collectExportFields(exportData);
    return { exportData, exportFields };
  };

  const allowStockFallback = imagesOnly ? false : await getExportStockFallbackEnabled();
  let includeStockWithoutWarehouse = !imagesOnly && !warehouseId && product.stock !== null;
  let exportFields = imagesOnly ? ['images'] : [];
  let result: ExportResult;

  if (!imagesOnly) {
    ({ exportFields } = await buildExportSnapshot(
      warehouseId,
      effectiveMappings,
      includeStockWithoutWarehouse
    ));
  }

  if (imagesOnly) {
    if (!listingExternalId) {
      await ErrorSystem.logWarning(
        '[export-to-base] Missing external listing id for images-only export',
        {
          productId: product.id,
          inventoryId: targetInventoryId,
        }
      );
      result = {
        success: false,
        error: 'Missing external listing id for images-only export',
      };
    } else {
      result = await exportProductImagesToBase(
        token,
        targetInventoryId,
        exportProduct,
        listingExternalId,
        buildImageExportOptions()
      );
    }
  } else {
    result = await exportProductToBase(
      token,
      targetInventoryId,
      exportProduct,
      effectiveMappings,
      warehouseId,
      buildExportOptions(includeStockWithoutWarehouse)
    );
  }

  const warehouseMismatch = !imagesOnly && hasWarehouseMismatch(result.error);

  if (!imagesOnly && !result.success && warehouseMismatch && allowStockFallback) {
    await ErrorSystem.logWarning('[export-to-base] Warehouse mismatch, retrying without stock', {
      productId: product.id,
      inventoryId: targetInventoryId,
      warehouseId,
      error: result.error,
    });
    warehouseId = null;
    effectiveMappings = withoutStockMappings(effectiveMappings);
    includeStockWithoutWarehouse = false;
    ({ exportFields } = await buildExportSnapshot(
      warehouseId,
      effectiveMappings,
      includeStockWithoutWarehouse
    ));
    result = await exportProductToBase(
      token,
      targetInventoryId,
      exportProduct,
      effectiveMappings,
      warehouseId,
      buildExportOptions(includeStockWithoutWarehouse)
    );
  }

  if (
    !imagesOnly &&
    canRetryWrite &&
    !result.success &&
    !warehouseMismatch &&
    includeStockWithoutWarehouse &&
    hasStockMismatch(result.error)
  ) {
    await ErrorSystem.logWarning('[export-to-base] Retrying without stock export', {
      productId: product.id,
      inventoryId: targetInventoryId,
      warehouseId,
      error: result.error,
    });
    warehouseId = null;
    effectiveMappings = withoutStockMappings(effectiveMappings);
    includeStockWithoutWarehouse = false;
    ({ exportFields } = await buildExportSnapshot(
      warehouseId,
      effectiveMappings,
      includeStockWithoutWarehouse
    ));
    result = await exportProductToBase(
      token,
      targetInventoryId,
      exportProduct,
      effectiveMappings,
      warehouseId,
      buildExportOptions(includeStockWithoutWarehouse)
    );
  }

  return {
    result,
    exportFields,
    finalMappings: effectiveMappings,
    finalWarehouseId: warehouseId,
    finalExportImagesAsBase64: exportImagesAsBase64,
    finalImageBase64Mode: imageBase64Mode,
    finalImageTransform: imageTransform,
  };
}
