import path from 'path';

import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import { mapBaseProduct } from '@/features/integrations/services/imports/base-mapper';
import { applyBaseParameterImport } from '@/features/integrations/services/imports/parameter-import/apply';
import { emitProductCacheInvalidation } from '@/shared/events/products';
import {
  findProductListingByProductAndConnectionAcrossProviders,
  getProductListingRepository,
} from '@/features/integrations/services/product-listing-repository';
import { getTagMappingRepository } from '@/features/integrations/services/tag-mapping-repository';
import type {
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportItemRecord,
  BaseImportMode,
  BaseParameterImportSummary,
  BaseImportRunRecord,
  ProductListing,
  ProductListingRepository,
} from '@/shared/contracts/integrations';
import {
  defaultBaseImportParameterImportSettings,
  normalizeBaseImportParameterImportSettings,
  type ImportTemplateParameterImport,
} from '@/shared/contracts/integrations';
import type {
  ParameterRepository,
  ProductParameter,
  ProductRecord,
  ProductWithImages,
  ProductParameterValue,
  CreateProduct as ProductCreateInput,
  UpdateProduct as ProductUpdateInput,
} from '@/shared/contracts/products';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import { productsRoot } from '@/shared/lib/files/server-constants';
import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import { getProducerRepository } from '@/shared/lib/products/services/producer-repository';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { getTagRepository } from '@/shared/lib/products/services/tag-repository';
import { validateProductCreate, validateProductUpdate } from '@/shared/lib/products/validations';

import {
  MAX_IMAGES_PER_PRODUCT,
  extractFilename,
  guessMimeType,
  isSkuConflictError,
  sanitizeSku,
  toStringId,
  type ImportDecision,
  type NormalizedMappedProduct,
  type ProcessItemResult,
  type ProductLookupMaps,
} from './base-import-service-shared';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  
    // Optional mapping data.
  }

  return {
    producerIdSet,
    producerNameToId,
    tagIdSet,
    tagNameToId,
    externalTagToInternalTagId,
  };
};

const resolveProducerIds = (values: string[] | undefined, lookups: ProductLookupMaps): string[] => {
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

const resolveTagIds = (values: string[] | undefined, lookups: ProductLookupMaps): string[] => {
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

const classifyByErrorCode = (
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

const downloadImage = async (url: string, sku: string, index: number): Promise<{ id: string }> => {
  const nodeFs = getFsPromises();
  const imageRepository = await getImageFileRepository();
  const response = await fetch(url);
  if (!response.ok) {
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
};

const createLinkedImage = async (url: string, index: number): Promise<{ id: string }> => {
  const imageRepository = await getImageFileRepository();
  const filename = extractFilename(url, `base-image-${index}.jpg`);
  return imageRepository.createImageFile({
    filename,
    filepath: url,
    mimetype: guessMimeType(url),
    size: 0,
  });
};

const linkImportedProductToBaseListing = async (input: {
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

const resolveUniqueSku = async (
  productRepository: Awaited<ReturnType<typeof getProductRepository>>,
  baseProductId: string | null,
  fallbackSeed: string
): Promise<string> => {
  const normalizedSeed = sanitizeSku(fallbackSeed) || 'BASE';
  const candidates: string[] = [];
  if (baseProductId) {
    candidates.push(`BASE-${sanitizeSku(baseProductId)}`);
  }
  candidates.push(normalizedSeed);

  const base = candidates[0] ?? 'BASE';
  for (let index = 0; index < 1000; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index}`;
    const existing = await productRepository.getProductBySku(candidate);
    if (!existing) return candidate;
  }
  return `BASE-${Date.now()}`;
};

const decideImportAction = (input: {
  mode: BaseImportMode;
  allowDuplicateSku: boolean;
  mappedBaseProductId: string | null;
  mappedSku: string | null;
  existingByBaseId: ProductRecord | null;
  existingBySku: ProductRecord | null;
}): ImportDecision => {
  const {
    mode,
    allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  } = input;

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

export const pickMappedSku = (mapped: NormalizedMappedProduct): string | null => {
  const rawSku = typeof mapped.sku === 'string' ? mapped.sku.trim() : '';
  return rawSku.length > 0 ? rawSku : null;
};

export const normalizeMappedProduct = (
  record: BaseProductRecord,
  mappings: Array<{ sourceKey: string; targetField: string }>,
  preferredCurrencies: string[]
): NormalizedMappedProduct => {
  const mapped = mapBaseProduct(record, mappings, {
    preferredPriceCurrencies: preferredCurrencies,
  }) as NormalizedMappedProduct;

  const sku = pickMappedSku(mapped);
  mapped.sku = sku ?? '';
  return mapped;
};

const normalizeParameterValues = (input: unknown): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const byParameterId = new Map<string, ProductParameterValue>();
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const parameterId =
      typeof record['parameterId'] === 'string' ? record['parameterId'].trim() : '';
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'] : '';
    const valuesByLanguageRaw = record['valuesByLanguage'];
    const valuesByLanguage =
      valuesByLanguageRaw &&
      typeof valuesByLanguageRaw === 'object' &&
      !Array.isArray(valuesByLanguageRaw)
        ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
          (acc: Record<string, string>, [languageCode, languageValue]: [string, unknown]) => {
            const normalizedLanguageCode = languageCode.trim().toLowerCase();
            if (!normalizedLanguageCode || typeof languageValue !== 'string') return acc;
            acc[normalizedLanguageCode] = languageValue;
            return acc;
          },
          {}
        )
        : {};
    byParameterId.set(parameterId, {
      parameterId,
      value,
      ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    });
  });
  return Array.from(byParameterId.values());
};

const mergeParameterValues = (
  base: ProductParameterValue[],
  overrides: ProductParameterValue[]
): ProductParameterValue[] => {
  const byParameterId = new Map<string, ProductParameterValue>();
  normalizeParameterValues(base).forEach((entry: ProductParameterValue) => {
    byParameterId.set(entry.parameterId, entry);
  });
  normalizeParameterValues(overrides).forEach((entry: ProductParameterValue) => {
    byParameterId.set(entry.parameterId, entry);
  });
  return Array.from(byParameterId.values());
};

type ParameterImportSummary = BaseParameterImportSummary;

type ParameterImportResult = {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: ParameterImportSummary;
};

export const importSingleItem = async (input: {
  run: BaseImportRunRecord;
  item: BaseImportItemRecord;
  raw: BaseProductRecord;
  baseIntegrationId: string;
  connectionId: string;
  token: string;
  targetCatalogId: string;
  defaultPriceGroupId: string;
  preferredPriceCurrencies: string[];
  lookups: ProductLookupMaps;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
  productRepository: Awaited<ReturnType<typeof getProductRepository>>;
  parameterRepository: ParameterRepository;
  imageMode: 'links' | 'download';
  dryRun: boolean;
  inventoryId: string;
  mode: BaseImportMode;
  allowDuplicateSku: boolean;
  parameterImportSettings?: ImportTemplateParameterImport;
  catalogLanguageCodes?: string[];
  defaultLanguageCode?: string | null;
  prefetchedParameters?: ProductParameter[];
  prefetchedLinks?: Record<string, string>;
  prefetchedProductsByBaseId?: Map<string, ProductWithImages>;
  prefetchedProductsBySku?: Map<string, ProductWithImages>;
  prefetchedListings?: Map<
    string,
    { listing: ProductListing; repository: ProductListingRepository }
  >;
}): Promise<ProcessItemResult> => {
  const mapped = normalizeMappedProduct(
    input.raw,
    input.templateMappings,
    input.preferredPriceCurrencies
  );
  const templateMappedParameterValues = normalizeParameterValues(mapped.parameters);
  const mappedProducerIds = resolveProducerIds(mapped.producerIds, input.lookups);
  const mappedTagIds = resolveTagIds(mapped.tagIds, input.lookups);
  const imageUrls = (mapped.imageLinks ?? []).slice(0, MAX_IMAGES_PER_PRODUCT);

  const mappedBaseProductId =
    mapped.baseProductId?.trim() ||
    toStringId(input.raw['base_product_id']) ||
    toStringId(input.raw['product_id']) ||
    toStringId(input.raw['id']);
  const mappedSku = pickMappedSku(mapped);

  const existingByBaseId = mappedBaseProductId
    ? (input.prefetchedProductsByBaseId?.get(mappedBaseProductId) ??
      (await input.productRepository.findProductByBaseId(mappedBaseProductId)))
    : null;
  const existingBySku = mappedSku
    ? (input.prefetchedProductsBySku?.get(mappedSku) ??
      (await input.productRepository.getProductBySku(mappedSku)))
    : null;

  const decision = decideImportAction({
    mode: input.mode,
    allowDuplicateSku: input.allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  });

  if (decision.type === 'skip') {
    const classified = classifyByErrorCode(decision.code);
    return {
      status: 'skipped',
      action: input.dryRun ? 'dry_run' : 'skipped',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'fail') {
    const classified = classifyByErrorCode(decision.code);
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'update') {
    const parameterImportResult = (await applyBaseParameterImport({
      record: input.raw,
      catalogId: input.targetCatalogId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      parameterRepository: input.parameterRepository,
      existingValues: Array.isArray(decision.target.parameters) ? decision.target.parameters : [],
      catalogLanguageCodes: input.catalogLanguageCodes ?? [],
      defaultLanguageCode: input.defaultLanguageCode ?? null,
      settings: normalizeBaseImportParameterImportSettings(
        input.parameterImportSettings ?? defaultBaseImportParameterImportSettings
      ),
      templateMappings: input.templateMappings,
      prefetchedParameters: input.prefetchedParameters,
      prefetchedLinks: input.prefetchedLinks,
    })) as ParameterImportResult;
    const parameterImportSummary: ParameterImportSummary | null = parameterImportResult.applied
      ? parameterImportResult.summary
      : null;
    const resolvedParameterValues = mergeParameterValues(
      parameterImportResult.applied ? parameterImportResult.parameters : [],
      templateMappedParameterValues
    );
    mapped.parameters = resolvedParameterValues.length > 0 ? resolvedParameterValues : undefined;

    const updateData: ProductUpdateInput = {
      baseProductId: mappedBaseProductId ?? decision.target.baseProductId ?? null,
      defaultPriceGroupId: input.defaultPriceGroupId,
      sku: mappedSku ?? undefined,
      name_en: mapped.name_en,
      name_pl: mapped.name_pl,
      name_de: mapped.name_de,
      description_en: mapped.description_en,
      description_pl: mapped.description_pl,
      description_de: mapped.description_de,
      price: mapped.price,
      stock: mapped.stock,
      weight: mapped.weight,
      sizeLength: mapped.sizeLength,
      sizeWidth: mapped.sizeWidth,
      length: mapped.length,
      imageLinks: imageUrls,
      ...(resolvedParameterValues.length > 0 ? { parameters: resolvedParameterValues } : {}),
    };

    if (mappedSku && !input.allowDuplicateSku && mappedSku !== decision.target.sku) {
      const skuOwner = await input.productRepository.getProductBySku(mappedSku);
      if (skuOwner && skuOwner.id !== decision.target.id) {
        const classified = classifyByErrorCode('DUPLICATE_SKU');
        return {
          status: 'skipped',
          action: input.dryRun ? 'dry_run' : 'skipped',
          baseProductId: mappedBaseProductId,
          sku: mappedSku,
          errorCode: 'DUPLICATE_SKU',
          errorClass: classified.errorClass,
          retryable: classified.retryable,
          errorMessage: `SKU ${mappedSku} already belongs to another product.`,
          payloadSnapshot: mapped,
          parameterImportSummary,
        };
      }
    }

    const validationResult = await validateProductUpdate(updateData);
    if (!validationResult.success) {
      const classified = classifyByErrorCode('VALIDATION_ERROR');
      return {
        status: 'failed',
        action: 'failed',
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        errorCode: 'VALIDATION_ERROR',
        errorClass: classified.errorClass,
        retryable: classified.retryable,
        errorMessage: `Validation failed for ${mappedSku ?? mappedBaseProductId ?? input.item.itemId}.`,
        payloadSnapshot: mapped,
        parameterImportSummary,
      };
    }

    if (input.dryRun) {
      return {
        status: 'updated',
        action: 'dry_run',
        importedProductId: decision.target.id,
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        payloadSnapshot: mapped,
        parameterImportSummary,
      };
    }

    const updated = await input.productRepository.updateProduct(
      decision.target.id,
      validationResult.data
    );

    if (!updated) {
      throw new Error(`Failed to update product ${decision.target.id}`);
    }

    await input.productRepository.replaceProductCatalogs(updated.id, [input.targetCatalogId]);
    if (mappedProducerIds.length > 0) {
      await input.productRepository.replaceProductProducers(updated.id, mappedProducerIds);
    }
    if (mappedTagIds.length > 0) {
      await input.productRepository.replaceProductTags(updated.id, mappedTagIds);
    }

    if (imageUrls.length > 0) {
      const imageFileIds: string[] = [];
      for (let index = 0; index < imageUrls.length; index += 1) {
        const url = imageUrls[index];
        if (!url) continue;
        const file =
          input.imageMode === 'download'
            ? await downloadImage(url, mappedSku ?? updated.id, index + 1)
            : await createLinkedImage(url, index + 1);
        imageFileIds.push(file.id);
      }
      if (imageFileIds.length > 0) {
        await input.productRepository.replaceProductImages(updated.id, imageFileIds);
      }
    }

    await linkImportedProductToBaseListing({
      product: updated,
      baseIntegrationId: input.baseIntegrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      baseProductId: mappedBaseProductId,
      existingListing: input.prefetchedListings?.get(updated.id) ?? null,
    });
    emitProductCacheInvalidation();

    return {
      status: 'updated',
      action: 'updated',
      importedProductId: updated.id,
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  let skuForCreate = mappedSku;
  if (!skuForCreate) {
    const classified = classifyByErrorCode('MISSING_SKU');
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: 'MISSING_SKU',
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: 'Cannot create product without SKU.',
      payloadSnapshot: mapped,
    };
  }

  if (existingBySku && input.allowDuplicateSku) {
    skuForCreate = await resolveUniqueSku(
      input.productRepository,
      mappedBaseProductId,
      `BASE-${mappedBaseProductId ?? skuForCreate}`
    );
  }

  const createData: ProductCreateInput = {
    ...mapped,
    sku: skuForCreate,
    baseProductId: mappedBaseProductId ?? null,
    defaultPriceGroupId: input.defaultPriceGroupId,
    imageLinks: imageUrls,
  };

  const parameterImportResult = (await applyBaseParameterImport({
    record: input.raw,
    catalogId: input.targetCatalogId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    parameterRepository: input.parameterRepository,
    existingValues: [],
    catalogLanguageCodes: input.catalogLanguageCodes ?? [],
    defaultLanguageCode: input.defaultLanguageCode ?? null,
    settings: normalizeBaseImportParameterImportSettings(
      input.parameterImportSettings ?? defaultBaseImportParameterImportSettings
    ),
    templateMappings: input.templateMappings,
    prefetchedParameters: input.prefetchedParameters,
    prefetchedLinks: input.prefetchedLinks,
  })) as ParameterImportResult;
  const parameterImportSummary: ParameterImportSummary | null = parameterImportResult.applied
    ? parameterImportResult.summary
    : null;
  const resolvedParameterValues = mergeParameterValues(
    parameterImportResult.applied ? parameterImportResult.parameters : [],
    templateMappedParameterValues
  );
  if (resolvedParameterValues.length > 0) {
    createData.parameters = resolvedParameterValues;
    mapped.parameters = resolvedParameterValues;
  } else {
    mapped.parameters = undefined;
  }

  const validationResult = await validateProductCreate(createData);
  if (!validationResult.success) {
    const classified = classifyByErrorCode('VALIDATION_ERROR');
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      errorCode: 'VALIDATION_ERROR',
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: `Validation failed for ${skuForCreate}.`,
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  if (input.dryRun) {
    return {
      status: 'imported',
      action: 'dry_run',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  let created: ProductRecord | null;
  try {
    created = await input.productRepository.createProduct(validationResult.data);
  } catch (error: unknown) {
    logClientError(error);
    if (isSkuConflictError(error) && input.allowDuplicateSku) {
      const fallbackSku = await resolveUniqueSku(
        input.productRepository,
        mappedBaseProductId,
        `BASE-${mappedBaseProductId ?? skuForCreate}`
      );
      const fallbackValidation = await validateProductCreate({
        ...createData,
        sku: fallbackSku,
      });
      if (!fallbackValidation.success) {
        throw new Error(`Validation failed for fallback SKU ${fallbackSku}`, { cause: error });
      }
      created = await input.productRepository.createProduct(fallbackValidation.data);
      skuForCreate = fallbackSku;
    } else {
      throw error;
    }
  }
  if (!created) {
    throw new Error('Failed to create product.');
  }

  await input.productRepository.replaceProductCatalogs(created.id, [input.targetCatalogId]);
  if (mappedProducerIds.length > 0) {
    await input.productRepository.replaceProductProducers(created.id, mappedProducerIds);
  }
  if (mappedTagIds.length > 0) {
    await input.productRepository.replaceProductTags(created.id, mappedTagIds);
  }

  if (imageUrls.length > 0) {
    const imageFileIds: string[] = [];
    for (let index = 0; index < imageUrls.length; index += 1) {
      const url = imageUrls[index];
      if (!url) continue;
      const file =
        input.imageMode === 'download'
          ? await downloadImage(url, skuForCreate, index + 1)
          : await createLinkedImage(url, index + 1);
      imageFileIds.push(file.id);
    }
    if (imageFileIds.length > 0) {
      await input.productRepository.addProductImages(created.id, imageFileIds);
    }
  }

  await linkImportedProductToBaseListing({
    product: created,
    baseIntegrationId: input.baseIntegrationId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    baseProductId: mappedBaseProductId,
    existingListing: input.prefetchedListings?.get(created.id) ?? null,
  });
  emitProductCacheInvalidation();

  return {
    status: 'imported',
    action: 'imported',
    importedProductId: created.id,
    baseProductId: mappedBaseProductId,
    sku: skuForCreate,
    payloadSnapshot: mapped,
    parameterImportSummary,
  };
};
