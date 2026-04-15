import 'server-only';

import { cache } from 'react';
import { ActivityTypes } from '@/shared/constants/observability';
import type {
  ImageFileRepository,
} from '@/shared/contracts/files';
import type { ProductParameterValue, ProductWithImages, ProductImageRecord, ProductRecord } from '@/shared/contracts/products/product';
import {
  normalizeProductMarketplaceContentOverrides,
  normalizeProductNotes,
} from '@/shared/contracts/products/product';
import type { ProductFilters, ProductRepository } from '@/shared/contracts/products/drafts';
import type { ProductCreateInput } from '@/shared/contracts/products/io';
import { badRequestError, duplicateEntryError, notFoundError } from '@/shared/errors/app-error';
import {
  deleteFileFromStorage,
  uploadFile,
  getImageFileRepository,
} from '@/shared/lib/files/services/image-file-service';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import {
  parseProductForm,
  type ParsedProductImageSequenceEntry,
} from '@/shared/lib/products/services/product-service-form-utils';
import { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
import { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';
import { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';
import {
  resolveEffectiveShippingGroup,
  resolveProductPrimaryCatalogId,
} from '@/shared/lib/products/utils/effective-shipping-group';
import { getTitleTermRepository } from '@/shared/lib/products/services/title-term-repository';
import {
  normalizeStructuredProductName,
  parseStructuredProductName,
  resolveLocalizedCategoryName,
} from '@/shared/lib/products/title-terms';
import { validateProductCreate, validateProductUpdate } from '@/shared/lib/products/validations';
import {
  filterProductCustomFieldValuesByDefinitions,
  normalizeProductCustomFieldValues,
} from '@/shared/lib/products/utils/custom-field-values';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { withRetry } from '@/shared/utils/retry';

const resolveProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> => getProductRepository(providerOverride);

const resolveImageFileRepository = async (): Promise<ImageFileRepository> =>
  getImageFileRepository();

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const enrichProductsWithEffectiveShippingGroups = async <TProduct extends ProductWithImages>(
  products: TProduct[],
  provider: ProductDbProvider
): Promise<TProduct[]> => {
  if (products.length === 0) {
    return products;
  }

  const primaryCatalogIds = Array.from(
    new Set(
      products
        .map((product) => resolveProductPrimaryCatalogId(product))
        .filter((catalogId): catalogId is string => typeof catalogId === 'string' && catalogId.length > 0)
    )
  );
  const manualShippingGroupIds = Array.from(
    new Set(
      products
        .map((product) => toTrimmedString(product.shippingGroupId))
        .filter((shippingGroupId): shippingGroupId is string => shippingGroupId.length > 0)
    )
  );

  if (primaryCatalogIds.length === 0 && manualShippingGroupIds.length === 0) {
    return products;
  }

  const [shippingGroupRepository, categoryRepository] = await Promise.all([
    getShippingGroupRepository(provider),
    getCategoryRepository(provider),
  ]);

  const [shippingGroupsByCatalogEntries, categoriesByCatalogEntries, manualShippingGroupEntries] =
    await Promise.all([
      Promise.all(
        primaryCatalogIds.map(async (catalogId) => [
          catalogId,
          await shippingGroupRepository.listShippingGroups({ catalogId }),
        ] as const)
      ),
      Promise.all(
        primaryCatalogIds.map(async (catalogId) => [
          catalogId,
          await categoryRepository.listCategories({ catalogId }),
        ] as const)
      ),
      Promise.all(
        manualShippingGroupIds.map(async (shippingGroupId) => [
          shippingGroupId,
          await shippingGroupRepository.getShippingGroupById(shippingGroupId),
        ] as const)
      ),
    ]);

  const shippingGroupsByCatalog = new Map(shippingGroupsByCatalogEntries);
  const categoriesByCatalog = new Map(categoriesByCatalogEntries);
  const manualShippingGroupsById = new Map(
    manualShippingGroupEntries.filter((entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null)
  );
  const shippingGroupNamesById = new Map<string, string>();
  for (const shippingGroups of shippingGroupsByCatalog.values()) {
    for (const shippingGroup of shippingGroups) {
      shippingGroupNamesById.set(toTrimmedString(shippingGroup.id), shippingGroup.name);
    }
  }
  for (const [shippingGroupId, shippingGroup] of manualShippingGroupsById.entries()) {
    shippingGroupNamesById.set(shippingGroupId, shippingGroup.name);
  }

  return products.map((product) => {
    const primaryCatalogId = resolveProductPrimaryCatalogId(product);
    const manualShippingGroupId = toTrimmedString(product.shippingGroupId);
    const resolution = resolveEffectiveShippingGroup({
      product,
      shippingGroups: primaryCatalogId ? (shippingGroupsByCatalog.get(primaryCatalogId) ?? []) : [],
      categories: primaryCatalogId ? (categoriesByCatalog.get(primaryCatalogId) ?? []) : [],
      manualShippingGroup: manualShippingGroupId
        ? (manualShippingGroupsById.get(manualShippingGroupId) ?? null)
        : null,
    });
    const matchingGroupNames = resolution.matchingShippingGroupIds
      .map((shippingGroupId) => shippingGroupNamesById.get(shippingGroupId) ?? '')
      .filter((shippingGroupName): shippingGroupName is string => shippingGroupName.length > 0);

    return {
      ...product,
      ...(resolution.shippingGroup ? { shippingGroup: resolution.shippingGroup } : {}),
      ...(resolution.source ? { shippingGroupSource: resolution.source } : {}),
      ...(resolution.reason !== 'none'
        ? { shippingGroupResolutionReason: resolution.reason }
        : {}),
      ...(resolution.matchedCategoryRuleIds.length > 0
        ? { shippingGroupMatchedCategoryRuleIds: resolution.matchedCategoryRuleIds }
        : {}),
      ...(matchingGroupNames.length > 0
        ? { shippingGroupMatchingGroupNames: matchingGroupNames }
        : {}),
    };
  });
};

const normalizeCreateProductPayloadForStorage = <TData extends Record<string, unknown>>(
  data: TData
): TData => {
  const payload = data as TData & {
    customFields?: unknown[] | null;
    parameters?: ProductParameterValue[] | null;
    imageFileIds?: string[] | null;
    marketplaceContentOverrides?: unknown[] | null;
    notes?: unknown;
  };
  return {
    ...(payload as TData),
    customFields: Array.isArray(payload.customFields)
      ? normalizeProductCustomFieldValues(payload.customFields)
      : [],
    parameters: Array.isArray(payload.parameters) ? payload.parameters : [],
    marketplaceContentOverrides: Array.isArray(payload.marketplaceContentOverrides)
      ? normalizeProductMarketplaceContentOverrides(payload.marketplaceContentOverrides)
      : [],
    ...(payload.notes !== undefined ? { notes: normalizeProductNotes(payload.notes) } : {}),
    imageFileIds: Array.isArray(payload.imageFileIds) ? payload.imageFileIds : undefined,
  } as TData;
};

const normalizeUpdateProductPayloadForStorage = <TData extends Record<string, unknown>>(
  data: TData
): TData => {
  const payload = data as TData & {
    customFields?: unknown[] | null;
    parameters?: ProductParameterValue[] | null;
    imageFileIds?: string[] | null;
    marketplaceContentOverrides?: unknown[] | null;
    notes?: unknown;
  };
  return {
    ...(payload as TData),
    ...(Array.isArray(payload.customFields)
      ? { customFields: normalizeProductCustomFieldValues(payload.customFields) }
      : {}),
    ...(Array.isArray(payload.parameters) ? { parameters: payload.parameters } : {}),
    ...(Array.isArray(payload.marketplaceContentOverrides)
      ? {
          marketplaceContentOverrides: normalizeProductMarketplaceContentOverrides(
            payload.marketplaceContentOverrides
          ),
        }
      : {}),
    ...(payload.notes !== undefined ? { notes: normalizeProductNotes(payload.notes) } : {}),
    imageFileIds: Array.isArray(payload.imageFileIds) ? payload.imageFileIds : undefined,
  } as TData;
};

const resolvePrimaryCatalogIdFromPayload = (input: {
  catalogIds?: string[] | undefined;
  product?: ProductWithImages | null | undefined;
}): string | null => {
  const payloadCatalogId = input.catalogIds?.find(
    (catalogId: string): boolean => catalogId.trim().length > 0
  );
  if (payloadCatalogId) {
    return payloadCatalogId;
  }
  return input.product ? resolveProductPrimaryCatalogId(input.product) ?? null : null;
};

const normalizeStructuredProductNameField = <TData extends Record<string, unknown>>(
  data: TData
): TData => {
  const rawName = data['name_en'];
  if (typeof rawName !== 'string') return data;
  const normalizedName = normalizeStructuredProductName(rawName);
  if (normalizedName === rawName) return data;
  return {
    ...data,
    name_en: normalizedName,
  };
};

const ensureStructuredProductNameTerms = async (input: {
  provider: ProductDbProvider;
  catalogId: string | null;
  nameEn: unknown;
}): Promise<void> => {
  if (!input.catalogId || typeof input.nameEn !== 'string') return;
  const parsed = parseStructuredProductName(input.nameEn);
  if (!parsed) return;

  const titleTermRepository = await getTitleTermRepository(input.provider);
  await Promise.all(
    [
      { type: 'size' as const, value: parsed.size },
      { type: 'material' as const, value: parsed.material },
      { type: 'theme' as const, value: parsed.theme },
    ].map(async ({ type, value }) => {
      const existing = await titleTermRepository.findByName(input.catalogId as string, type, value);
      if (existing) return;
      await titleTermRepository.createTitleTerm({
        catalogId: input.catalogId as string,
        type,
        name_en: value,
        name_pl: null,
      });
    })
  );
};

const normalizeStructuredCategorySegment = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const resolveStructuredCategoryAliases = (category: {
  name: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
}): string[] =>
  Array.from(
    new Set(
      [
        resolveLocalizedCategoryName(category, 'en'),
        category.name,
        category.name_en,
        category.name_pl,
        category.name_de,
      ]
        .map((value) => (typeof value === 'string' ? normalizeStructuredCategorySegment(value) : ''))
        .filter((value) => value.length > 0)
    )
  );

const assertStructuredProductNameCategory = async (input: {
  provider: ProductDbProvider;
  categoryId: unknown;
  nameEn: unknown;
}): Promise<void> => {
  if (typeof input.nameEn !== 'string') return;
  const parsed = parseStructuredProductName(input.nameEn);
  if (!parsed) return;

  const categoryId =
    typeof input.categoryId === 'string' && input.categoryId.trim().length > 0
      ? input.categoryId.trim()
      : null;

  if (!categoryId) {
    throw badRequestError('Structured product names require a selected category.', {
      field: 'categoryId',
      name_en: input.nameEn,
    });
  }

  const categoryRepository = await getCategoryRepository(input.provider);
  const category = await categoryRepository.getCategoryById(categoryId);
  if (!category) {
    throw badRequestError('Selected category was not found for this product.', {
      field: 'categoryId',
      categoryId,
    });
  }

  const normalizedSegment = normalizeStructuredCategorySegment(parsed.category);
  const categoryAliases = resolveStructuredCategoryAliases(category);
  const normalizedCategoryName = categoryAliases[0] ?? normalizeStructuredCategorySegment(category.name);

  if (!categoryAliases.includes(normalizedSegment)) {
    throw badRequestError('Structured product name category must match the selected category.', {
      field: 'name_en',
      categoryId,
      expectedCategory: normalizedCategoryName,
      receivedCategory: normalizedSegment,
    });
  }
};

const EXPLICIT_PARAMETER_CLEAR_FLAG_KEYS = [
  'forceClearParameters',
  'allowEmptyParameters',
  'clearParameters',
] as const;

const isTruthyFlag = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const hasExplicitParameterClearIntent = (value: unknown): boolean => {
  if (value instanceof FormData) {
    return EXPLICIT_PARAMETER_CLEAR_FLAG_KEYS.some((key) => isTruthyFlag(value.get(key)));
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return EXPLICIT_PARAMETER_CLEAR_FLAG_KEYS.some((key) => isTruthyFlag(record[key]));
};

const hasNonEmptyParameterValues = (value: unknown): value is ProductParameterValue[] =>
  Array.isArray(value) && value.length > 0;

const preserveExistingParametersOnImplicitClear = async (input: {
  id: string;
  existing: ProductWithImages;
  normalized: Record<string, unknown>;
  rawInput: unknown;
}): Promise<Record<string, unknown>> => {
  if (!Object.prototype.hasOwnProperty.call(input.normalized, 'parameters')) {
    return input.normalized;
  }

  const nextParameters = input.normalized['parameters'];
  if (!Array.isArray(nextParameters) || nextParameters.length > 0) {
    return input.normalized;
  }

  if (!hasNonEmptyParameterValues(input.existing.parameters)) {
    return input.normalized;
  }

  if (hasExplicitParameterClearIntent(input.rawInput)) {
    return input.normalized;
  }

  void ErrorSystem.logWarning('Prevented implicit parameter clear on product update.', {
    service: 'product-service',
    action: 'updateProduct',
    productId: input.id,
    metadata: {
      existingParameterCount: input.existing.parameters.length,
    },
  });

  return {
    ...input.normalized,
    parameters: input.existing.parameters,
  };
};

type RelationPayload = {
  imageFileIds?: string[] | undefined;
  catalogIds?: string[] | undefined;
  categoryId?: string | null | undefined;
  tagIds?: string[] | undefined;
  producerIds?: string[] | undefined;
  noteIds?: string[] | undefined;
};

const appendUniqueImageFileId = (target: string[], candidate: unknown): void => {
  if (typeof candidate !== 'string') return;
  const normalized = candidate.trim();
  if (!normalized || target.includes(normalized)) return;
  target.push(normalized);
};

const normalizeRelationArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const unique: string[] = [];
  value.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized || unique.includes(normalized)) return;
    unique.push(normalized);
  });
  return unique;
};

const normalizeRelationCategory = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || null;
};

const resolveUploadSku = (normalizedSku: unknown, fallbackSku: unknown): string | null => {
  if (typeof normalizedSku === 'string' && normalizedSku.trim().length > 0) {
    return normalizedSku.trim();
  }
  if (typeof fallbackSku === 'string' && fallbackSku.trim().length > 0) {
    return fallbackSku.trim();
  }
  return null;
};

const uploadFilesForProduct = async (
  files: File[],
  sku: string | null,
  provider: ProductDbProvider
): Promise<Map<File, string>> => {
  const results = await Promise.all(
    files.map(async (file) => {
      const imageFile = await uploadFile(file, {
        category: 'products',
        provider,
        ...(sku ? { sku } : {}),
        filenameOverride: file.name,
      });
      return { file, id: imageFile.id };
    })
  );
  const uploadedByFile = new Map<File, string>();
  results.forEach(({ file, id }) => uploadedByFile.set(file, id));
  return uploadedByFile;
};

const resolveOrderedImageFileIds = (
  imageSequence: ParsedProductImageSequenceEntry[],
  uploadedByFile: Map<File, string>,
  fallbackImageFileIds: string[]
): string[] => {
  const orderedIds: string[] = [];

  imageSequence.forEach((entry: ParsedProductImageSequenceEntry): void => {
    if (entry.kind === 'existing') {
      appendUniqueImageFileId(orderedIds, entry.imageFileId);
      return;
    }
    appendUniqueImageFileId(orderedIds, uploadedByFile.get(entry.file));
  });

  fallbackImageFileIds.forEach((id: string) => appendUniqueImageFileId(orderedIds, id));
  return orderedIds;
};

const applyProductRelations = async (
  repository: ProductRepository,
  productId: string,
  relations: RelationPayload
): Promise<void> => {
  const tasks: Promise<unknown>[] = [];

  if (relations.imageFileIds !== undefined) {
    tasks.push(repository.replaceProductImages(productId, relations.imageFileIds));
  }
  if (relations.catalogIds !== undefined) {
    tasks.push(repository.replaceProductCatalogs(productId, relations.catalogIds));
  }
  if (relations.categoryId !== undefined) {
    tasks.push(repository.replaceProductCategory(productId, relations.categoryId));
  }
  if (relations.tagIds !== undefined) {
    tasks.push(repository.replaceProductTags(productId, relations.tagIds));
  }
  if (relations.producerIds !== undefined) {
    tasks.push(repository.replaceProductProducers(productId, relations.producerIds));
  }
  if (relations.noteIds !== undefined) {
    tasks.push(repository.replaceProductNotes(productId, relations.noteIds));
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};

const sanitizeCustomFieldsForStorage = async <TData extends Record<string, unknown>>(
  provider: ProductDbProvider,
  data: TData
): Promise<TData> => {
  if (!Object.prototype.hasOwnProperty.call(data, 'customFields')) {
    return data;
  }

  const repository = await getCustomFieldRepository(provider);
  const definitions = await repository.listCustomFields({});

  return {
    ...data,
    customFields: filterProductCustomFieldValuesByDefinitions(data['customFields'], definitions),
  } as TData;
};

const shouldLogTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';

type ProductQueryTimings = Record<string, number | null | undefined>;

async function getProducts(
  filters: ProductFilters,
  options?: { timings?: ProductQueryTimings; provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages[]> {
  try {
    const timings = options?.timings;
    const totalStart = performance.now();
    const provider = options?.provider ?? (await getProductDataProvider());
    const productRepository = await resolveProductRepository(provider);

    const repoStart = performance.now();
    const products = await productRepository.getProducts(filters);
    const repoMs = performance.now() - repoStart;
    if (timings) {
      timings['repo'] = repoMs;
    }

    const totalMs = performance.now() - totalStart;
    if (timings) {
      timings['total'] = totalMs;
    }

    if (shouldLogTiming()) {
      await ErrorSystem.logInfo(
        `[getProducts] Total: ${totalMs.toFixed(2)}ms, Repo: ${repoMs.toFixed(2)}ms`,
        {
          service: 'product-service',
          action: 'getProducts',
          totalMs,
          repoMs,
        }
      );
    }

    return await enrichProductsWithEffectiveShippingGroups(products, provider);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'product-service',
      action: 'getProducts',
      filters,
    });
    throw error;
  }
}

const getProductById = cache(
  async (
    id: string,
    options?: { provider?: ProductDbProvider }
  ): Promise<ProductWithImages | null> => {
    const provider = options?.provider ?? (await getProductDataProvider());
    const productRepository = await resolveProductRepository(provider);
    const product = await productRepository.getProductById(id);
    if (!product) return null;
    const [enrichedProduct] = await enrichProductsWithEffectiveShippingGroups([product], provider);
    return enrichedProduct ?? null;
  }
);

async function getProductBySku(
  sku: string,
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductBySku(sku);
  if (!product) return null;
  const [enrichedProduct] = await enrichProductsWithEffectiveShippingGroups(
    [product as ProductWithImages],
    provider
  );
  return enrichedProduct ?? null;
}

async function getProductsBySkus(
  skus: string[],
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const products = await productRepository.getProductsBySkus(skus);
  return await enrichProductsWithEffectiveShippingGroups(products as ProductWithImages[], provider);
}

async function findProductsByBaseIds(
  baseIds: string[],
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  if (baseIds.length === 0) return [];
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const products = await productRepository.findProductsByBaseIds(baseIds);
  return await enrichProductsWithEffectiveShippingGroups(products as ProductWithImages[], provider);
}

async function createProduct(
  data: unknown,
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const parsedForm = data instanceof FormData ? parseProductForm(data) : null;
  const inputData = parsedForm ? parsedForm.rawData : data;
  const validation = await validateProductCreate(inputData);
  if (!validation.success) {
    throw badRequestError('Product validation failed', {
      errors: validation.errors,
    });
  }

  const normalized = await sanitizeCustomFieldsForStorage(
    provider,
    normalizeStructuredProductNameField(
      normalizeCreateProductPayloadForStorage(validation.data)
    )
  );

  const existingBySku = await productRepository.getProductBySku(normalized.sku);
  if (existingBySku) {
    throw duplicateEntryError(`A product with SKU "${normalized.sku}" already exists.`, {
      sku: normalized.sku,
      existingProductId: existingBySku.id,
    });
  }

  await assertStructuredProductNameCategory({
    provider,
    categoryId: parsedForm ? parsedForm.categoryId : normalized.categoryId,
    nameEn: normalized.name_en,
  });

  const product = await productRepository.createProduct(normalized);
  if (!product) {
    const sku = normalized.sku ? ` (SKU: ${normalized.sku})` : '';
    throw badRequestError(`Failed to create product${sku}`);
  }

  const relationPayload: RelationPayload = {
    imageFileIds: normalizeRelationArray(normalized.imageFileIds),
    catalogIds: normalizeRelationArray(normalized.catalogIds),
    categoryId: normalizeRelationCategory(normalized.categoryId),
    tagIds: normalizeRelationArray(normalized.tagIds),
    producerIds: normalizeRelationArray(normalized.producerIds),
    noteIds: normalizeRelationArray(normalized.noteIds),
  };

  if (parsedForm) {
    const uploadSku = resolveUploadSku(normalized.sku, null);
    const uploadedByFile = await uploadFilesForProduct(parsedForm.images, uploadSku, provider);
    relationPayload.imageFileIds = resolveOrderedImageFileIds(
      parsedForm.imageSequence,
      uploadedByFile,
      parsedForm.imageFileIds
    );
    relationPayload.catalogIds = parsedForm.catalogIds;
    relationPayload.categoryId = parsedForm.categoryId;
    relationPayload.tagIds = parsedForm.tagIds;
    relationPayload.producerIds = parsedForm.producerIds;
    relationPayload.noteIds = parsedForm.noteIds;
  }

  await ensureStructuredProductNameTerms({
    provider,
    catalogId: resolvePrimaryCatalogIdFromPayload({
      catalogIds: relationPayload.catalogIds,
    }),
    nameEn: normalized.name_en,
  });

  await applyProductRelations(productRepository, product.id, relationPayload);

  const refreshed = await productRepository.getProductById(product.id);
  if (!refreshed) {
    throw badRequestError(`Failed to load created product: ${product.id}`);
  }

  void logActivity({
    type: ActivityTypes.PRODUCT.CREATED,
    entityId: refreshed.id,
    entityType: 'product',
    userId: options?.userId,
    description: `Created product: ${refreshed.name_en || refreshed.name_pl || refreshed.id}`,
    metadata: { productId: refreshed.id },
  });

  const [enrichedProduct] = await enrichProductsWithEffectiveShippingGroups([refreshed], provider);
  return enrichedProduct ?? refreshed;
}

async function bulkCreateProducts(
  data: ProductCreateInput[],
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<number> {
  if (data.length === 0) return 0;
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const validatedData: ProductCreateInput[] = [];
  for (const item of data) {
    const validation = await validateProductCreate(item);
    if (validation.success) {
      validatedData.push(
        await sanitizeCustomFieldsForStorage(
          provider,
          normalizeCreateProductPayloadForStorage(validation.data)
        )
      );
    }
  }

  if (validatedData.length === 0) return 0;
  return productRepository.bulkCreateProducts(validatedData);
}

async function updateProduct(
  id: string,
  data: unknown,
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  // Parse form synchronously so validation can start immediately.
  const parsedForm = data instanceof FormData ? parseProductForm(data) : null;
  const inputData = parsedForm ? parsedForm.rawData : data;

  // Run DB existence check and validation in parallel — neither depends on the other.
  const [existing, validation] = await Promise.all([
    productRepository.getProductById(id),
    validateProductUpdate(inputData),
  ]);

  if (!existing) {
    throw notFoundError(`Product not found: ${id}`);
  }
  if (!validation.success) {
    throw badRequestError('Product validation failed', {
      errors: validation.errors,
    });
  }

  const normalized = await preserveExistingParametersOnImplicitClear({
    id,
    existing,
    normalized: await sanitizeCustomFieldsForStorage(
      provider,
      normalizeStructuredProductNameField(
        normalizeUpdateProductPayloadForStorage(validation.data)
      )
    ),
    rawInput: data,
  });

  const nextSku = normalized['sku'];
  if (typeof nextSku === 'string' && nextSku.trim().length > 0 && nextSku.trim() !== existing.sku) {
    const normalizedNextSku = nextSku.trim();
    const existingBySku = await productRepository.getProductBySku(normalizedNextSku);
    if (existingBySku && existingBySku.id !== id) {
      throw duplicateEntryError(`A product with SKU "${normalizedNextSku}" already exists.`, {
        sku: normalizedNextSku,
        existingProductId: existingBySku.id,
      });
    }
  }

  // Run DB write and image uploads in parallel — they are independent of each other.
  const uploadSku = parsedForm ? resolveUploadSku(normalized['sku'], existing.sku) : null;
  const imageUploadTask: Promise<Map<File, string>> =
    parsedForm && parsedForm.images.length > 0
      ? uploadFilesForProduct(parsedForm.images, uploadSku, provider)
      : Promise.resolve(new Map<File, string>());

  const [product, uploadedByFile] = await Promise.all([
    withRetry(() => productRepository.updateProduct(id, normalized), {
      maxAttempts: 2,
      initialDelayMs: 300,
      maxDelayMs: 3000,
      source: 'productService.updateProduct',
    }),
    imageUploadTask,
  ]);

  if (!product) {
    throw badRequestError(`Failed to update product: ${id}`);
  }

  const relationPayload: RelationPayload = {
    imageFileIds: normalizeRelationArray(normalized['imageFileIds']),
    catalogIds: normalizeRelationArray(normalized['catalogIds']),
    categoryId: normalizeRelationCategory(normalized['categoryId']),
    tagIds: normalizeRelationArray(normalized['tagIds']),
    producerIds: normalizeRelationArray(normalized['producerIds']),
    noteIds: normalizeRelationArray(normalized['noteIds']),
  };

  if (parsedForm) {
    relationPayload.imageFileIds = resolveOrderedImageFileIds(
      parsedForm.imageSequence,
      uploadedByFile,
      parsedForm.imageFileIds
    );
    relationPayload.catalogIds = parsedForm.catalogIds;
    relationPayload.categoryId = parsedForm.categoryId;
    relationPayload.tagIds = parsedForm.tagIds;
    relationPayload.producerIds = parsedForm.producerIds;
    relationPayload.noteIds = parsedForm.noteIds;
  }

  await ensureStructuredProductNameTerms({
    provider,
    catalogId: resolvePrimaryCatalogIdFromPayload({
      catalogIds: relationPayload.catalogIds,
      product: existing,
    }),
    nameEn: normalized['name_en'] ?? existing.name_en,
  });

  await applyProductRelations(productRepository, id, relationPayload);

  const refreshed = await withRetry(() => productRepository.getProductById(id), {
    maxAttempts: 2,
    initialDelayMs: 300,
    maxDelayMs: 3000,
    source: 'productService.updateProduct.refresh',
  });
  if (!refreshed) {
    throw badRequestError(`Failed to load updated product: ${id}`);
  }

  void logActivity({
    type: ActivityTypes.PRODUCT.UPDATED,
    entityId: refreshed.id,
    entityType: 'product',
    userId: options?.userId,
    description: `Updated product: ${refreshed.name_en || refreshed.name_pl || refreshed.id}`,
    metadata: { productId: refreshed.id },
  });

  const [enrichedProduct] = await enrichProductsWithEffectiveShippingGroups([refreshed], provider);
  return enrichedProduct ?? refreshed;
}
async function duplicateProduct(
  id: string,
  sku: string,
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages | null> {
  if (!sku || sku.trim() === '') {
    throw badRequestError('SKU is required for duplication.', { sku: sku });
  }
  const provider = options?.provider ?? (await getProductDataProvider());

  const productRepository = await resolveProductRepository(provider);

  const normalizedSku = sku.trim();
  const existingBySku = await productRepository.getProductBySku(normalizedSku);
  if (existingBySku) {
    throw duplicateEntryError(`A product with SKU "${normalizedSku}" already exists.`, {
      sku: normalizedSku,
      existingProductId: existingBySku.id,
    });
  }

  const duplicated = await productRepository.duplicateProduct(id, normalizedSku);
  if (!duplicated) return null;

  void logActivity({
    type: ActivityTypes.PRODUCT.DUPLICATED,
    entityId: duplicated.id,
    entityType: 'product',
    userId: options?.userId,
    description: `Duplicated product ${id} to ${duplicated.id} with SKU ${sku}`,
    metadata: { sourceProductId: id, targetProductId: duplicated.id, sku },
  });

  return getProductById(duplicated.id, { provider });
}

async function deleteProduct(
  id: string,
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<ProductRecord | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const product = await productRepository.deleteProduct(id);
  if (!product) return null;

  void logActivity({
    type: ActivityTypes.PRODUCT.DELETED,
    entityId: id,
    entityType: 'product',
    userId: options?.userId,
    description: `Deleted product: ${product.name_en || product.name_pl || id}`,
    metadata: { productId: id },
  });

  return product;
}

async function uploadProductImage(
  productId: string,
  file: File,
  options?: { provider?: ProductDbProvider }
): Promise<ProductImageRecord> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw badRequestError(`Product not found: ${productId}`);
  }

  const imageFile = await uploadFile(file, {
    category: 'products',
    provider,
    ...(product.sku ? { sku: product.sku } : {}),
    filenameOverride: file.name,
  });

  await productRepository.addProductImages(productId, [imageFile.id]);
  const images = await productRepository.getProductImages(productId);
  const productImage = images.find((i) => i.imageFileId === imageFile.id);

  if (!productImage) {
    throw badRequestError('Failed to verify uploaded product image', { productId, imageId: imageFile.id });
  }

  return productImage;
}

async function deleteProductImage(
  productId: string,
  imageId: string,
  options?: { provider?: ProductDbProvider }
): Promise<void> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const imageRepository = await resolveImageFileRepository();

  const imageFile = await imageRepository.getImageFileById(imageId);
  if (!imageFile) return;

  // 1. Remove the link
  await productRepository.removeProductImage(productId, imageId);

  // 2. Check if others use it
  const remainingLinksCount = await productRepository.countProductsByImageFileId(imageId);

  // 3. Cleanup if last link
  if (remainingLinksCount === 0) {
    await deleteFileFromStorage(imageFile.filepath);
    throw badRequestError('Failed to delete product image', { productId, imageId });
  }
}

async function countProducts(
  filters: ProductFilters,
  options?: { provider?: ProductDbProvider }
): Promise<number> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  return productRepository.countProducts(filters);
}

async function getProductsWithCount(
  filters: ProductFilters,
  options?: { provider?: ProductDbProvider }
): Promise<{ products: ProductWithImages[]; total: number }> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const result = await productRepository.getProductsWithCount(filters);
  return {
    products: await enrichProductsWithEffectiveShippingGroups(result.products, provider),
    total: result.total,
  };
}

export const productService = {
  getProducts,
  countProducts,
  getProductsWithCount,
  getProductById,
  getProductBySku,
  getProductsBySkus,
  findProductsByBaseIds,
  createProduct,
  bulkCreateProducts,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  uploadProductImage,
  unlinkImageFromProduct: deleteProductImage,
  deleteProductImage,
};
