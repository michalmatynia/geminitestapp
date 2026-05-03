import 'server-only';

import {
  checkBaseSkuExists,
  getExportWarehouseId,
  resolveBaseConnectionToken,
} from '@/features/integrations/server';
import * as Segments from '@/features/integrations/services/base-export-segments';
import type { BaseExportRequestData } from '@/features/integrations/services/base-export-segments';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, externalServiceError } from '@/shared/errors/app-error';

import type { BaseExportJobData } from './baseExportQueue';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
const BASE_IMAGE_RETRY_MODE: BaseExportExecutionArgs['imageBase64Mode'] = 'base-only';
const BASE_IMAGE_RETRY_TRANSFORM: NonNullable<BaseExportExecutionArgs['imageTransform']> = {
  forceJpeg: true,
  maxDimension: 1600,
  jpegQuality: 85,
};

export type BaseExportExecutionArgs = Parameters<typeof Segments.executeBaseExport>[0];
export type BaseExportExecution = Awaited<ReturnType<typeof Segments.executeBaseExport>>;
type LoadedResources = Awaited<ReturnType<typeof Segments.loadExportResources>>;
export type ValidatedResources = LoadedResources & {
  product: ProductWithImages;
  connection: NonNullable<LoadedResources['connection']>;
};
export type PreparedExportContext = Awaited<
  ReturnType<typeof Segments.prepareBaseExportMappingsAndProduct<ProductWithImages>>
>;
export type ListingResolution = Awaited<ReturnType<typeof Segments.resolveListingForExport>>;
export type WarehouseResolution = Awaited<ReturnType<typeof Segments.resolveWarehouseAndStockMappings>>;

const nullToUndefined = <T>(value: T | null): T | undefined => {
  if (value === null) return undefined;
  return value;
};

export const normalizeOptionalId = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isBaseIntegration = (integration: LoadedResources['integrations'][number]): boolean =>
  BASE_INTEGRATION_SLUGS.has(integration.slug);

export const loadValidatedResources = async (
  data: BaseExportJobData
): Promise<ValidatedResources> => {
  const resources = await Segments.loadExportResources(data.productId, data.connectionId);

  if (resources.product === null) {
    throw externalServiceError('Product not found', { productId: data.productId });
  }
  if (resources.connection === null) {
    throw externalServiceError('Connection not found', { connectionId: data.connectionId });
  }

  return { ...resources, product: resources.product, connection: resources.connection };
};

const buildPrepareRequestData = (data: BaseExportJobData): BaseExportRequestData => ({
  connectionId: data.connectionId,
  inventoryId: data.inventoryId,
  templateId: nullToUndefined(data.templateId),
  imagesOnly: data.imagesOnly,
  listingId: nullToUndefined(data.listingId),
  externalListingId: nullToUndefined(data.externalListingId),
  allowDuplicateSku: data.allowDuplicateSku,
  exportImagesAsBase64: nullToUndefined(data.exportImagesAsBase64),
  imageBase64Mode: nullToUndefined(data.imageBase64Mode),
  imageTransform: nullToUndefined(data.imageTransform),
});

export const prepareExportContext = async (
  data: BaseExportJobData,
  product: ProductWithImages
): Promise<PreparedExportContext> =>
  Segments.prepareBaseExportMappingsAndProduct<ProductWithImages>({
    data: buildPrepareRequestData(data),
    imagesOnly: data.imagesOnly,
    productId: data.productId,
    resolvedInventoryId: data.inventoryId,
    product,
  });

export const resolveToken = (
  connection: ValidatedResources['connection'],
  connectionId: string
): string => {
  const tokenResult = resolveBaseConnectionToken({ baseApiToken: connection.baseApiToken });
  const token = tokenResult.token ?? '';

  if (token === '') {
    throw badRequestError(tokenResult.error ?? 'No Base API token configured.', { connectionId });
  }

  return token;
};

export const resolveListing = async (
  data: BaseExportJobData,
  resources: ValidatedResources
): Promise<ListingResolution> => {
  const baseIntegration = resources.integrations.find(isBaseIntegration);

  return Segments.resolveListingForExport({
    productId: data.productId,
    connectionId: data.connectionId,
    inventoryId: data.inventoryId,
    imagesOnly: data.imagesOnly,
    externalListingId: data.externalListingId,
    listingIdFromData: data.listingId,
    baseIntegrationId: baseIntegration?.id ?? resources.connection.integrationId,
    primaryListingRepo: resources.primaryListingRepo,
  });
};

export const clearListingFailureReason = async (listing: ListingResolution): Promise<void> => {
  if (listing.listingId === null) return;
  await listing.listingRepo.updateListing(listing.listingId, { failureReason: null });
};

export const resolveTargetInventoryId = (
  data: BaseExportJobData,
  listing: ListingResolution
): string => {
  if (data.imagesOnly && listing.listingInventoryId !== null) return listing.listingInventoryId;
  return data.inventoryId;
};

export const resolveWarehouse = async (
  data: BaseExportJobData,
  token: string,
  targetInventoryId: string,
  preparedContext: PreparedExportContext
): Promise<WarehouseResolution> => {
  const initialWarehouseId = data.imagesOnly ? null : await getExportWarehouseId(targetInventoryId);

  return Segments.resolveWarehouseAndStockMappings({
    imagesOnly: data.imagesOnly,
    token,
    targetInventoryId,
    initialWarehouseId,
    mappings: preparedContext.mappings,
    productId: data.productId,
  });
};

export const verifySku = async (
  data: BaseExportJobData,
  token: string,
  listing: ListingResolution,
  product: ProductWithImages
): Promise<void> => {
  await Segments.verifySkuUniqueness({
    allowDuplicateSku: data.imagesOnly ? true : data.allowDuplicateSku,
    listingExternalId: listing.listingExternalId,
    sku: product.sku,
    token,
    inventoryId: data.inventoryId,
  });
};

type ImageDiagnosticsInput = {
  data: BaseExportJobData;
  targetInventoryId: string;
  exportImagesAsBase64: boolean;
  imageBase64Mode: BaseExportExecutionArgs['imageBase64Mode'];
  imageTransform: BaseExportExecutionArgs['imageTransform'];
};

const buildImageDiagnostics = ({
  data,
  targetInventoryId,
  exportImagesAsBase64,
  imageBase64Mode,
  imageTransform,
}: ImageDiagnosticsInput): BaseExportExecutionArgs['baseImageDiagnostics'] =>
  Segments.buildImageDiagnosticsLogger({
    productId: data.productId,
    connectionId: data.connectionId,
    inventoryId: targetInventoryId,
    exportImagesAsBase64,
    imageBase64Mode,
    imageTransform,
  });

const buildInitialImageDiagnostics = (
  data: BaseExportJobData,
  targetInventoryId: string,
  preparedContext: PreparedExportContext
): BaseExportExecutionArgs['baseImageDiagnostics'] | undefined => {
  if (!preparedContext.exportImagesAsBase64) return undefined;

  return buildImageDiagnostics({
    data,
    targetInventoryId,
    exportImagesAsBase64: preparedContext.exportImagesAsBase64,
    imageBase64Mode: preparedContext.imageBase64Mode,
    imageTransform: preparedContext.imageTransform,
  });
};

export const buildBaseExportArgs = ({
  data,
  token,
  targetInventoryId,
  preparedContext,
  warehouse,
  listing,
  product,
}: {
  data: BaseExportJobData;
  token: string;
  targetInventoryId: string;
  preparedContext: PreparedExportContext;
  warehouse: WarehouseResolution;
  listing: ListingResolution;
  product: ProductWithImages;
}): BaseExportExecutionArgs => ({
  imagesOnly: data.imagesOnly,
  token,
  targetInventoryId,
  exportProduct: preparedContext.exportProduct,
  effectiveMappings: warehouse.effectiveMappings,
  warehouseId: warehouse.warehouseId,
  listingExternalId: listing.listingExternalId,
  imageBaseUrl: data.imageBaseUrl,
  stockWarehouseAliases: nullToUndefined(warehouse.stockWarehouseAliases),
  producerNameById: preparedContext.producerNameById ?? {},
  producerExternalIdByInternalId: preparedContext.producerExternalIdByInternalId ?? {},
  tagNameById: preparedContext.tagNameById ?? {},
  tagExternalIdByInternalId: preparedContext.tagExternalIdByInternalId ?? {},
  exportImagesAsBase64: preparedContext.exportImagesAsBase64,
  imageBase64Mode: preparedContext.imageBase64Mode,
  imageTransform: preparedContext.imageTransform,
  baseImageDiagnostics: buildInitialImageDiagnostics(data, targetInventoryId, preparedContext),
  product,
  canRetryWrite: data.imagesOnly || listing.listingExternalId !== null,
});

const retryBaseImageExport = (
  data: BaseExportJobData,
  targetInventoryId: string,
  baseExportArgs: BaseExportExecutionArgs
): Promise<BaseExportExecution> =>
  Segments.executeBaseExport({
    ...baseExportArgs,
    exportImagesAsBase64: true,
    imageBase64Mode: BASE_IMAGE_RETRY_MODE,
    imageTransform: BASE_IMAGE_RETRY_TRANSFORM,
    baseImageDiagnostics: buildImageDiagnostics({
      data,
      targetInventoryId,
      exportImagesAsBase64: true,
      imageBase64Mode: BASE_IMAGE_RETRY_MODE,
      imageTransform: BASE_IMAGE_RETRY_TRANSFORM,
    }),
  });

export const executeWithImageRetry = async (
  data: BaseExportJobData,
  targetInventoryId: string,
  baseExportArgs: BaseExportExecutionArgs
): Promise<BaseExportExecution> => {
  const execution = await Segments.executeBaseExport(baseExportArgs);

  if (execution.result.success) return execution;
  if (!Segments.isBaseImageError(execution.result.error)) return execution;

  return retryBaseImageExport(data, targetInventoryId, baseExportArgs);
};

const shouldCheckExistingSku = (
  execution: BaseExportExecution,
  data: BaseExportJobData,
  product: ProductWithImages
): boolean => {
  if (execution.result.success) return false;
  if (data.imagesOnly) return false;
  return normalizeOptionalId(product.sku) !== '';
};

export const applyExistingSkuFallback = async ({
  execution,
  data,
  token,
  targetInventoryId,
  product,
}: {
  execution: BaseExportExecution;
  data: BaseExportJobData;
  token: string;
  targetInventoryId: string;
  product: ProductWithImages;
}): Promise<BaseExportExecution> => {
  if (!shouldCheckExistingSku(execution, data, product)) return execution;

  const check = await checkBaseSkuExists(token, targetInventoryId, normalizeOptionalId(product.sku));
  if (!check.exists) return execution;

  return { ...execution, result: { success: true, productId: check.productId } };
};
