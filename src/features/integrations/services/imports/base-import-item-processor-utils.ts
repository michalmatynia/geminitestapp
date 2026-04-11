import path from 'path';
import { getTagMappingRepository } from '@/features/integrations/services/tag-mapping-repository';
import type { BaseImportErrorClass, BaseImportErrorCode, BaseImportMode } from '@/shared/contracts/integrations/base-com';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import type { ProductRecord, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductCreateInput } from '@/shared/contracts/products/io';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import { productsRoot } from '@/shared/lib/files/server-constants';
import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import { getProducerRepository } from '@/shared/lib/products/services/producer-repository';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { getTagRepository } from '@/shared/lib/products/services/tag-repository';
import { validateProductCreate, validateProductUpdate } from '@/shared/lib/products/validations';
import { findProductListingByProductAndConnectionAcrossProviders, getProductListingRepository } from '@/features/integrations/services/product-listing-repository';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  extractFilename,
  guessMimeType,
  sanitizeSku,
  type ImportDecision,
  type ProductLookupMaps,
} from './base-import-service-shared';

export const resolveProducerAndTagLookups = async (
  connectionId: string
): Promise<ProductLookupMaps> => {
  const producerRepository = await getProducerRepository();
  const producers = await producerRepository.listProducers({});
  const producerIdSet = new Set(
    producers
      .map((producer: { id: string }) => producer.id?.trim())
      .filter((producerId: string | undefined): producerId is string => Boolean(producerId))
  );
  const producerNameToId = new Map(
    producers
      .map((producer: { id: string; name: string }) => {
        const normalizedName =
          typeof producer.name === 'string' ? producer.name.trim().toLowerCase() : '';
        const normalizedId = typeof producer.id === 'string' ? producer.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const tagRepository = await getTagRepository();
  const tags = await tagRepository.listTags({});
  const tagIdSet = new Set(
    tags
      .map((tag: { id: string }) => tag.id?.trim())
      .filter((tagId: string | undefined): tagId is string => Boolean(tagId))
  );
  const tagNameToId = new Map(
    tags
      .map((tag: { id: string; name: string }) => {
        const normalizedName = typeof tag.name === 'string' ? tag.name.trim().toLowerCase() : '';
        const normalizedId = typeof tag.id === 'string' ? tag.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const externalTagToInternalTagId = new Map<string, string>();
  try {
    const tagMappingRepo = getTagMappingRepository();
    const tagMappings = await tagMappingRepo.listByConnection(connectionId);
    tagMappings.forEach((mapping) => {
      if (!mapping.isActive) return;
      const externalId = mapping.externalTag?.externalId?.trim();
      const internalId = mapping.internalTagId?.trim();
      if (!externalId || !internalId) return;
      externalTagToInternalTagId.set(externalId, internalId);
      externalTagToInternalTagId.set(externalId.toLowerCase(), internalId);
    });
  } catch (error) {
    logClientError(error);
  }

  return {
    producerIdSet,
    producerNameToId,
    tagIdSet,
    tagNameToId,
    externalTagToInternalTagId,
  };
};

export const resolveProducerIds = (values: string[] | undefined, lookups: ProductLookupMaps): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const unique = new Set<string>();
  values.forEach((rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    if (lookups.producerIdSet.has(trimmed)) {
      unique.add(trimmed);
      return;
    }
    const byName = lookups.producerNameToId.get(trimmed.toLowerCase());
    if (byName) unique.add(byName);
  });
  return Array.from(unique);
};

export const resolveTagIds = (values: string[] | undefined, lookups: ProductLookupMaps): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const unique = new Set<string>();
  values.forEach((rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const mappedExternal =
      lookups.externalTagToInternalTagId.get(trimmed) ??
      lookups.externalTagToInternalTagId.get(trimmed.toLowerCase());
    if (mappedExternal) {
      unique.add(mappedExternal);
      return;
    }

    if (lookups.tagIdSet.has(trimmed)) {
      unique.add(trimmed);
      return;
    }

    const byName = lookups.tagNameToId.get(trimmed.toLowerCase());
    if (byName) unique.add(byName);
  });
  return Array.from(unique);
};

export const classifyByErrorCode = (
  code: BaseImportErrorCode
): { errorClass: BaseImportErrorClass; retryable: boolean } => {
  if (
    code === 'MISSING_CONNECTION' ||
    code === 'MISSING_CATALOG' ||
    code === 'MISSING_PRICE_GROUP' ||
    code === 'PRECHECK_FAILED'
  ) {
    return { errorClass: 'configuration', retryable: false };
  }
  if (code === 'CANCELED') {
    return { errorClass: 'canceled', retryable: false };
  }
  if (code === 'TIMEOUT' || code === 'RATE_LIMITED' || code === 'NETWORK_ERROR') {
    return { errorClass: 'transient', retryable: true };
  }
  if (code === 'BASE_FETCH_ERROR' || code === 'LINKING_ERROR') {
    return { errorClass: 'transient', retryable: true };
  }
  return { errorClass: 'permanent', retryable: false };
};

export const formatProductValidationFailure = (
  label: string,
  errors:
    | Array<{
        field: string;
        message: string;
      }>
    | undefined
): string => {
  const details = (errors ?? [])
    .map((error) => {
      const field = error.field?.trim() || 'root';
      const message = error.message?.trim() || 'Invalid value.';
      return `${field}: ${message}`;
    })
    .filter((detail) => detail.length > 0)
    .slice(0, 3);

  if (details.length === 0) {
    return `Validation failed for ${label}.`;
  }

  return `Validation failed for ${label}. ${details.join(' | ')}`;
};

const DOWNLOAD_MAX_ATTEMPTS = 3;
const DOWNLOAD_RETRY_DELAY_MS = 1000;
const STRUCTURED_PRODUCT_NAME_FORMAT_MESSAGE_PREFIX = 'English name must use format:';

const isRetryableHttpStatus = (status: number): boolean =>
  status === 429 || status === 503 || status === 502 || status === 504;

export const downloadImage = async (url: string, sku: string, index: number): Promise<{ id: string }> => {
  const nodeFs = getFsPromises();
  const imageRepository = await getImageFileRepository();

  let lastError: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (isRetryableHttpStatus(response.status) && attempt < DOWNLOAD_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS * attempt));
          continue;
        }
        throw new Error(`Failed to download image (${response.status})`, { cause: response });
      }
      const contentType = response.headers.get('content-type') || guessMimeType(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const folderName = sku ? sanitizeSku(sku) : 'temp';
      const filename = `${Date.now()}-${index}-${extractFilename(url, 'image.jpg')}`;
      const diskDir = path.join(productsRoot, folderName);
      const publicPath = `/uploads/products/${folderName}/${filename}`;
      await nodeFs.mkdir(diskDir, { recursive: true });
      await nodeFs.writeFile(joinRuntimePath(diskDir, filename), buffer);
      return imageRepository.createImageFile({
        filename,
        filepath: publicPath,
        mimetype: contentType,
        size: buffer.length,
      });
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
};

export const createLinkedImage = async (url: string, index: number): Promise<{ id: string }> => {
  const imageRepository = await getImageFileRepository();
  const filename = extractFilename(url, `base-image-${index}.jpg`);
  return imageRepository.createImageFile({
    filename,
    filepath: url,
    mimetype: guessMimeType(url),
    size: 0,
  });
};

const isStructuredEnglishNameCreateValidationError = (field: string, message: string): boolean =>
  field === 'name_en' && message.includes(STRUCTURED_PRODUCT_NAME_FORMAT_MESSAGE_PREFIX);

export const validateImportedCreateData = async (
  createData: ProductCreateInput
): Promise<
  | { success: true; data: ProductCreateInput }
  | {
      success: false;
      errors: Array<{
        field: string;
        message: string;
        code: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        context?: Record<string, unknown> | undefined;
      }>;
    }
> => {
  const validationResult = await validateProductCreate(createData);
  if (validationResult.success) {
    return { success: true, data: validationResult.data };
  }

  const hasErrors = validationResult.errors.length > 0;
  const onlyStructuredNameErrors =
    hasErrors &&
    validationResult.errors.every((error) =>
      isStructuredEnglishNameCreateValidationError(error.field, error.message)
    );

  if (!onlyStructuredNameErrors) {
    return { success: false, errors: validationResult.errors };
  }

  const fallbackValidation = await validateProductUpdate(createData);
  if (!fallbackValidation.success) {
    return { success: false, errors: validationResult.errors };
  }

  const normalizedSku =
    typeof fallbackValidation.data.sku === 'string' ? fallbackValidation.data.sku.trim() : '';
  if (!normalizedSku) {
    return { success: false, errors: validationResult.errors };
  }

  const normalizedCreateData: ProductCreateInput = {
    ...fallbackValidation.data,
    sku: normalizedSku,
  };

  return {
    success: true,
    data: normalizedCreateData,
  };
};

export const linkImportedProductToBaseListing = async (input: {
  product: ProductWithImages | ProductRecord;
  baseIntegrationId: string;
  connectionId: string;
  inventoryId: string;
  baseProductId: string | null | undefined;
  existingListing?: { listing: ProductListing; repository: ProductListingRepository } | null;
}): Promise<void> => {
  const normalizedBaseProductId = input.baseProductId?.trim() || '';
  if (!normalizedBaseProductId) return;
  const baseMarketplaceMetadata = {
    source: 'base-import',
    marketplace: 'base',
  } as const;

  const existingListing =
    input.existingListing ??
    (await findProductListingByProductAndConnectionAcrossProviders(
      input.product.id,
      input.connectionId
    ));

  if (existingListing) {
    if (existingListing.listing.externalListingId !== normalizedBaseProductId) {
      await existingListing.repository.updateListingExternalId(
        existingListing.listing.id,
        normalizedBaseProductId
      );
    }
    if ((existingListing.listing.inventoryId ?? null) !== input.inventoryId) {
      await existingListing.repository.updateListingInventoryId(
        existingListing.listing.id,
        input.inventoryId
      );
    }
    if (existingListing.listing.status !== 'active') {
      await existingListing.repository.updateListingStatus(existingListing.listing.id, 'active');
    }
    await existingListing.repository.updateListing(existingListing.listing.id, {
      marketplaceData: {
        ...(existingListing.listing.marketplaceData ?? {}),
        ...baseMarketplaceMetadata,
      },
    });
    return;
  }

  const listingRepository = await getProductListingRepository();
  const createdListing = await listingRepository.createListing({
    productId: input.product.id,
    integrationId: input.baseIntegrationId,
    connectionId: input.connectionId,
    status: 'active',
    externalListingId: normalizedBaseProductId,
    inventoryId: input.inventoryId,
    marketplaceData: baseMarketplaceMetadata,
  });
  await listingRepository.updateListingStatus(createdListing.id, 'active');
};

export const resolveUniqueSku = async (
  productRepository: Awaited<ReturnType<typeof getProductRepository>>,
  preferredSeed: string,
  baseProductId: string | null
): Promise<string> => {
  const normalizedSeed = sanitizeSku(preferredSeed);
  const roots: string[] = [];
  if (normalizedSeed) {
    roots.push(normalizedSeed);
  }
  if (baseProductId) {
    roots.push(`BASE-${sanitizeSku(baseProductId)}`);
  }
  roots.push('BASE');

  const uniqueRoots = Array.from(new Set(roots.filter((value: string): boolean => value.length > 0)));
  for (const root of uniqueRoots) {
    for (let index = 0; index < 1000; index += 1) {
      const candidate = index === 0 ? root : `${root}-${index}`;
      const existing = await productRepository.getProductBySku(candidate);
      if (!existing) return candidate;
    }
  }
  return `BASE-${Date.now()}`;
};

export const decideImportAction = (input: {
  mode: BaseImportMode;
  forceCreateNewProduct: boolean;
  allowDuplicateSku: boolean;
  mappedBaseProductId: string | null;
  mappedSku: string | null;
  existingByBaseId: ProductRecord | null;
  existingBySku: ProductRecord | null;
}): ImportDecision => {
  const {
    mode,
    forceCreateNewProduct,
    allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  } = input;

  if (forceCreateNewProduct) {
    return { type: 'create' };
  }

  if (mode === 'create_only') {
    if (existingByBaseId) {
      return {
        type: 'skip',
        code: 'CONFLICT',
        message: `Product with Base ID ${mappedBaseProductId ?? 'unknown'} already exists.`,
      };
    }
    if (existingBySku && !allowDuplicateSku) {
      return {
        type: 'skip',
        code: 'DUPLICATE_SKU',
        message: `SKU ${mappedSku ?? 'unknown'} already exists.`,
      };
    }
    return { type: 'create' };
  }

  if (mode === 'upsert_on_base_id') {
    if (!mappedBaseProductId) {
      return {
        type: 'fail',
        code: 'MISSING_BASE_ID',
        message: 'Missing Base product ID for upsert_on_base_id mode.',
      };
    }

    if (existingByBaseId) {
      if (existingBySku && existingBySku.id !== existingByBaseId.id && !allowDuplicateSku) {
        return {
          type: 'skip',
          code: 'CONFLICT',
          message: `SKU ${mappedSku ?? 'unknown'} belongs to a different product.`,
        };
      }
      return { type: 'update', target: existingByBaseId };
    }

    if (existingBySku && !allowDuplicateSku) {
      return {
        type: 'skip',
        code: 'DUPLICATE_SKU',
        message: `SKU ${mappedSku ?? 'unknown'} already exists.`,
      };
    }

    return { type: 'create' };
  }

  if (!mappedSku) {
    return {
      type: 'fail',
      code: 'MISSING_SKU',
      message: 'Missing SKU for upsert_on_sku mode.',
    };
  }

  if (existingBySku) {
    if (existingByBaseId && existingByBaseId.id !== existingBySku.id) {
      return {
        type: 'skip',
        code: 'CONFLICT',
        message: 'Base ID and SKU refer to different existing products.',
      };
    }
    return { type: 'update', target: existingBySku };
  }

  if (existingByBaseId && !allowDuplicateSku) {
    return {
      type: 'skip',
      code: 'CONFLICT',
      message: 'Base ID already exists on another product.',
    };
  }

  return { type: 'create' };
};
