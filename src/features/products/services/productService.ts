/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import 'server-only';

import {
  deleteFileFromStorage,
  uploadFile,
  getImageFileRepository,
} from '@/features/files/server';
import {
  ErrorSystem,
  logActivity,
  ActivityTypes,
} from '@/features/observability/server';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/features/products/services/product-provider';
import { getProductRepository } from '@/features/products/services/product-repository';
import { getProductImageFilepath } from '@/features/products/services/product-service-form-utils';
import {
  validateProductCreate,
  validateProductUpdate,
} from '@/features/products/validations';
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
} from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

export type ImageFileRepository = {
  createImageFile(data: ImageFileCreateInput): Promise<ImageFileRecord>;
  getImageFileById(id: string): Promise<ImageFileRecord | null>;
  listImageFiles(filters?: ImageFileListFilters): Promise<ImageFileRecord[]>;
  findImageFilesByIds(ids: string[]): Promise<ImageFileRecord[]>;
  updateImageFilePath(
    id: string,
    filepath: string,
  ): Promise<ImageFileRecord | null>;
  updateImageFileTags(
    id: string,
    tags: string[],
  ): Promise<ImageFileRecord | null>;
  deleteImageFile(id: string): Promise<ImageFileRecord | null>;
};

const resolveProductRepository = async (
  providerOverride?: ProductDbProvider,
): Promise<ProductRepository> => getProductRepository(providerOverride);

const resolveImageFileRepository = async (): Promise<ImageFileRepository> =>
  getImageFileRepository() as unknown as Promise<ImageFileRepository>;

const normalizeProductPayloadForStorage = <
  TData extends Record<string, unknown>,
>(
    data: TData,
  ): TData => {
  const payload = data as TData & {
    parameters?: ProductParameterValue[] | null;
  };
  return {
    ...(payload as TData),
    parameters: Array.isArray(payload.parameters) ? payload.parameters : [],
  } as TData;
};

const shouldLogTiming = (): boolean =>
  process.env['DEBUG_API_TIMING'] === 'true';

type ProductQueryTimings = Record<string, number | null | undefined>;

async function getProducts(
  filters: ProductFilters,
  options?: { timings?: ProductQueryTimings; provider?: ProductDbProvider; userId?: string }
): Promise<ProductWithImages[]> {
  try {
    const timings = options?.timings;
    const totalStart = performance.now();
    const provider = options?.provider ?? await getProductDataProvider();
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
      console.log(
        `[getProducts] Total: ${totalMs.toFixed(2)}ms, Repo: ${repoMs.toFixed(2)}ms`,
      );
    }

    return products;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-service',
      action: 'getProducts',
      filters,
    });
    throw error;
  }
}

async function getProductById(
  id: string,
  options?: { provider?: ProductDbProvider },
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductById(id);
  if (!product) return null;
  return product as ProductWithImages;
}

async function getProductBySku(
  sku: string,
  options?: { provider?: ProductDbProvider },
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductBySku(sku);
  if (!product) return null;
  return product as ProductWithImages;
}

async function createProduct(
  data: unknown,
  options?: { provider?: ProductDbProvider; userId?: string },
): Promise<ProductWithImages> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const validated = validateProductCreate(data);
  const normalized = normalizeProductPayloadForStorage(validated);

  const product = await productRepository.createProduct(normalized);

  void logActivity({
    type: ActivityTypes.PRODUCT.CREATED,
    entityId: product.id,
    entityType: 'product',
    userId: options?.userId,
    description: `Created product: ${product.name_en || product.name_pl || product.id}`,
    metadata: { productId: product.id },
  });

  return { ...product, images: [] };
}

async function updateProduct(
  id: string,
  data: unknown,
  options?: { provider?: ProductDbProvider; userId?: string },
): Promise<ProductWithImages> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const existing = await productRepository.getProductById(id);
  if (!existing) {
    throw badRequestError(`Product not found: ${id}`);
  }

  const validated = validateProductUpdate(data);
  const normalized = normalizeProductPayloadForStorage(validated);

  const product = await productRepository.updateProduct(id, normalized);
  if (!product) {
    throw badRequestError(`Failed to update product: ${id}`);
  }

  void logActivity({
    type: ActivityTypes.PRODUCT.UPDATED,
    entityId: product.id,
    entityType: 'product',
    userId: options?.userId,
    description: `Updated product: ${product.name_en || product.name_pl || product.id}`,
    metadata: { productId: product.id },
  });

  return product as ProductWithImages;
}

async function duplicateProduct(
  id: string,
  sku: string,
  options?: { provider?: ProductDbProvider; userId?: string },
): Promise<ProductWithImages | null> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);

  const duplicated = await productRepository.duplicateProduct(id, sku);
  if (!duplicated) return null;

  // Duplicate images if any
  const images = await productRepository.getProductImages(id);
  if (images.length > 0) {
    await productRepository.addProductImages(
      duplicated.id,
      images.map((i) => i.imageFileId),
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
  options?: { provider?: ProductDbProvider; userId?: string },
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
  options?: { provider?: ProductDbProvider },
): Promise<ProductImageRecord> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const imageRepository = await resolveImageFileRepository();

  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw badRequestError(`Product not found: ${productId}`);
  }

  const publicPath = getProductImageFilepath(productId, file.name);
  const storedPath = await uploadFile(file, publicPath);

  const imageFile = await imageRepository.createImageFile({
    filename: file.name,
    filepath: storedPath,
    filesize: file.size,
    mimeType: file.type,
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
  options?: { provider?: ProductDbProvider },
): Promise<void> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  const imageRepository = await resolveImageFileRepository();

  const imageFile = await imageRepository.getImageFileById(imageId);
  if (imageFile) {
    await deleteFileFromStorage(imageFile.filepath);
    await imageRepository.deleteImageFile(imageId);
  }

  await productRepository.removeProductImage(productId, imageId);
}

async function countProducts(
  filters: ProductFilters,
  options?: { provider?: ProductDbProvider },
): Promise<number> {
  const provider = options?.provider ?? (await getProductDataProvider());
  const productRepository = await resolveProductRepository(provider);
  return productRepository.countProducts(filters);
}

async function getProductsWithCount(
  filters: ProductFilters,
  options?: { provider?: ProductDbProvider },
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
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  uploadProductImage,
  unlinkImageFromProduct: deleteProductImage,
  deleteProductImage,
};
