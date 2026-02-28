import 'server-only';

import {
  deleteFileFromStorage,
  uploadFile,
  getImageFileRepository,
} from '@/shared/lib/files/services/image-file-service';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ActivityTypes } from '@/shared/constants/observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import {
  parseProductForm,
  type ParsedProductImageSequenceEntry,
} from '@/shared/lib/products/services/product-service-form-utils';
import { validateProductCreate, validateProductUpdate } from '@/shared/lib/products/validations';
import type {
  ImageFileRecordDto as ImageFileRecord,
  ImageFileCreateInputDto as ImageFileCreateInput,
  ImageFileListFiltersDto as ImageFileListFilters,
} from '@/shared/contracts/files';
import type {
  ProductParameterValue,
  ProductWithImages,
  ProductImageRecord,
  ProductRecord,
  ProductFilters,
  ProductRepository,
  CreateProductDto,
  ProductCreateInputDto,
} from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export type ImageFileRepository = {
  createImageFile(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getImageFileById(id: string): Promise<ImageFileRecord | null>;
  listImageFiles(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  findImageFilesByIds(ids: string[]): Promise<ImageFileRecord[]>;
  updateImageFilePath(id: string, filepath: string): Promise<ImageFileRecord | null>;
  updateImageFileTags(id: string, tags: string[]): Promise<ImageFileRecord | null>;
  deleteImageFile(id: string): Promise<ImageFileRecord | null>;
};

const resolveProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> => getProductRepository(providerOverride);

const resolveImageFileRepository = async (): Promise<ImageFileRepository> =>
  getImageFileRepository() as unknown as Promise<ImageFileRepository>;

const normalizeProductPayloadForStorage = <TData extends Record<string, unknown>>(
  data: TData
): TData => {
  const payload = data as TData & {
    parameters?: ProductParameterValue[] | null;
    imageFileIds?: string[] | null;
  };
  return {
    ...(payload as TData),
    parameters: Array.isArray(payload.parameters) ? payload.parameters : [],
    imageFileIds: Array.isArray(payload.imageFileIds) ? payload.imageFileIds : undefined,
  } as TData;
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
  const uploadedByFile = new Map<File, string>();
  for (const file of files) {
    const imageFile = await uploadFile(file, {
      category: 'products',
      provider,
      ...(sku ? { sku } : {}),
      filenameOverride: file.name,
    });
    uploadedByFile.set(file, imageFile.id);
  }
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
      console.log(`[getProducts] Total: ${totalMs.toFixed(2)}ms, Repo: ${repoMs.toFixed(2)}ms`);
    }

    return products;
  } catch (error) {
    void (ErrorSystem as any).captureException(error, {
      service: 'product-service',
      action: 'getProducts',
      filters,
    });
    throw error;
  }
}

async function getProductById(
  id: string,
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductById(id);
  if (!product) return null;
  return product;
}

async function getProductBySku(
  sku: string,
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductBySku(sku);
  if (!product) return null;
  return product as ProductWithImages;
}

async function getProductsBySkus(
  skus: string[],
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const products = await productRepository.getProductsBySkus(skus);
  return products as ProductWithImages[];
}

async function findProductsByBaseIds(
  baseIds: string[],
  options?: { provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  if (baseIds.length === 0) return [];
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const products = await productRepository.findProductsByBaseIds(baseIds);
  return products as ProductWithImages[];
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

  const normalized = normalizeProductPayloadForStorage(validation.data);

  const product = await productRepository.createProduct(normalized);
  if (!product) {
    throw badRequestError('Failed to create product');
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

  return refreshed;
}

async function bulkCreateProducts(
  data: CreateProductDto[],
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<number> {
  if (data.length === 0) return 0;
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const validatedData: ProductCreateInputDto[] = [];
  for (const item of data) {
    const validation = await validateProductCreate(item);
    if (validation.success) {
      validatedData.push(normalizeProductPayloadForStorage(validation.data));
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

  const existing = await productRepository.getProductById(id);
  if (!existing) {
    throw notFoundError(`Product not found: ${id}`);
  }

  const parsedForm = data instanceof FormData ? parseProductForm(data) : null;
  const inputData = parsedForm ? parsedForm.rawData : data;
  const validation = await validateProductUpdate(inputData);
  if (!validation.success) {
    throw badRequestError('Product validation failed', {
      errors: validation.errors,
    });
  }

  const normalized = normalizeProductPayloadForStorage(validation.data);

  const product = await productRepository.updateProduct(id, normalized);
  if (!product) {
    throw badRequestError(`Failed to update product: ${id}`);
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
    const uploadSku = resolveUploadSku(normalized.sku, existing.sku);
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

  await applyProductRelations(productRepository, id, relationPayload);

  const refreshed = await productRepository.getProductById(id);
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

  return refreshed;
}
async function duplicateProduct(
  id: string,
  sku: string,
  options?: { provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages | null> {
  if (!sku || sku.trim() === '') {
    throw badRequestError('SKU is required for duplication.');
  }
  const provider = options?.provider ?? (await getProductDataProvider());

  const productRepository = await resolveProductRepository(provider);

  const duplicated = await productRepository.duplicateProduct(id, sku);
  if (!duplicated) return null;

  // Duplicate images if any
  const images = await productRepository.getProductImages(id);
  if (images.length > 0) {
    await productRepository.addProductImages(
      duplicated.id,
      images.map((i) => i.imageFileId)
    );
  }

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
    throw badRequestError('Failed to verify uploaded product image');
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
    await imageRepository.deleteImageFile(imageId);
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

  return await productRepository.getProductsWithCount(filters);
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
