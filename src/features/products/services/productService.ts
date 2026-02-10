 
 
 
 
 
 
 
 
import 'server-only';

// This service encapsulates all business logic for managing products.

import fs from 'fs/promises';
import path from 'path';

import { getDiskPathFromPublicPath, uploadFile } from '@/features/files/server';
import { getImageFileRepository } from '@/features/files/server';
import type { ImageFileRepository } from '@/features/files/types/services/image-file-repository';
import { ErrorSystem, logActivity, ActivityTypes, logSystemEvent } from '@/features/observability/server';
import { performanceMonitor } from '@/features/products/performance';
import { getCatalogRepository } from '@/features/products/services/catalog-repository';
import { getProductDataProvider, type ProductDbProvider } from '@/features/products/services/product-provider';
import { getProductRepository } from '@/features/products/services/product-repository';
import type {
  ProductWithImages,
  ProductImageRecord,
  ProductRecord,
} from '@/features/products/types';
import type {
  ProductFilters,
  ProductRepository,
} from '@/features/products/types/services/product-repository';
import {
  validateProductCreate,
  validateProductUpdate,
} from '@/features/products/validations';
import { badRequestError } from '@/shared/errors/app-error';
import { getDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';

const resolveProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> =>
  getProductRepository(providerOverride);
const resolveImageFileRepository = async (): Promise<ImageFileRepository> =>
  getImageFileRepository();

const tempProductPathPrefix = '/uploads/products/temp/';

type ParsedProductForm = {
  rawData: Record<string, unknown>;
  images: File[];
  imageFileIds: string[];
  catalogIds: string[];
  categoryId: string | null;
  tagIds: string[];
  producerIds: string[];
  noteIds: string[];
};

/**
 * Parses FormData into a structured object for product operations.
 */
function parseProductForm(formData: FormData): ParsedProductForm {
  const rawData = Object.fromEntries(formData.entries());
  const images = formData.getAll('images').filter((x): x is File => x instanceof File && x.size > 0);
  const imageFileIds = formData.getAll('imageFileIds').filter((x): x is string => typeof x === 'string');
  const catalogIds = normalizeCatalogIds(formData.getAll('catalogIds'));
  const categoryId = normalizeCategoryId(formData);
  const tagIds = normalizeTagIds(formData.getAll('tagIds'));
  const producerIds = normalizeProducerIds(formData.getAll('producerIds'));
  const noteIds = normalizeNoteIds(formData.getAll('noteIds'));

  return {
    rawData,
    images,
    imageFileIds,
    catalogIds,
    categoryId,
    tagIds,
    producerIds,
    noteIds,
  };
}

/**
 * Retrieves a list of products based on the provided filters.
 * @param filters - The filter criteria.
 * @returns A list of products.
 */
const shouldLogTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';

type ProductQueryTimings = Record<string, number | null | undefined>;

const getFallbackProvider = (provider: ProductDbProvider): ProductDbProvider =>
  provider === 'prisma' ? 'mongodb' : 'prisma';

const isProviderAvailable = (provider: ProductDbProvider): boolean =>
  provider === 'mongodb'
    ? Boolean(process.env['MONGODB_URI'])
    : Boolean(process.env['DATABASE_URL']);

const shouldCompareFallbackProvider = async (): Promise<boolean> => {
  const policy = await getDatabaseEnginePolicy();
  if (!policy.allowAutomaticFallback) return false;
  return process.env['PRODUCTS_COMPARE_FALLBACK_PROVIDER'] === 'true';
};

async function getProducts(
  filters: ProductFilters,
  options?: { timings?: ProductQueryTimings; provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  const timings = options?.timings;
  const totalStart = performance.now();
  const provider = options?.provider ?? await getProductDataProvider();
  const productRepository = await resolveProductRepository(provider);

  const repoStart = performance.now();
  let products = await productRepository.getProducts(filters);
  const repoMs = performance.now() - repoStart;
  if (timings) {
    timings['repo'] = repoMs;
  }
  performanceMonitor.record('db.query', repoMs, { operation: 'getProducts', provider });

  const fallbackProvider = getFallbackProvider(provider);
  const compareFallbackProvider = await shouldCompareFallbackProvider();
  if (compareFallbackProvider && isProviderAvailable(fallbackProvider)) {
    const fallbackRepository = await resolveProductRepository(fallbackProvider);
    const shouldCompareCounts =
      products.length === 0 || Number(filters.page ?? 1) === 1;

    let primaryCount = products.length;
    let fallbackCount = 0;

    if (shouldCompareCounts) {
      const countStart = performance.now();
      primaryCount = await productRepository.countProducts(filters);
      fallbackCount = await fallbackRepository.countProducts(filters);
      if (timings) {
        timings['countCompare'] = performance.now() - countStart;
      }
    } else if (products.length === 0) {
      fallbackCount = await fallbackRepository.countProducts(filters);
    }

    const shouldUseFallback =
      (products.length === 0 && fallbackCount > 0) || fallbackCount > primaryCount;

    if (shouldUseFallback) {
      const fallbackStart = performance.now();
      const fallbackProducts = await fallbackRepository.getProducts(filters);
      const fallbackMs = performance.now() - fallbackStart;
      if (timings) {
        timings['repoFallback'] = fallbackMs;
      }
      performanceMonitor.record('db.query', fallbackMs, {
        operation: 'getProducts.fallback',
        provider: fallbackProvider,
      });
      products = fallbackProducts;
      await logSystemEvent({
        level: 'warn',
        message:
          '[products] Primary provider has fewer matching rows; using fallback provider.',
        context: {
          primaryProvider: provider,
          fallbackProvider,
          primaryCount,
          fallbackCount,
          returnedCount: fallbackProducts.length,
          filters,
        },
      });
    }
  }

  const imagesStart = performance.now();
  
  // We no longer perform fs.access checks here for performance.
  // Missing files will result in a 404 which is faster than checking every file on every list load.
  const result = products.map((product: ProductWithImages): ProductWithImages => {
    if (!product.images?.length) {
      return product;
    }

    return {
      ...product,
      images: product.images.filter((image: ProductImageRecord) => {
        const filepath = image.imageFile?.filepath;
        return Boolean(filepath);
      }),
    };
  });

  const imagesMs = performance.now() - imagesStart;
  if (timings) {
    timings['images'] = imagesMs;
    timings['fsChecks'] = 0;
    timings['total'] = performance.now() - totalStart;
  }
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] productService.getProducts',
      context: {
        provider,
        repoMs: Math.round(repoMs),
        imagesMs: Math.round(imagesMs),
        fsChecks: 0,
        totalMs: Math.round(performance.now() - totalStart),
      },
    });
  }
  return result;
}

/**
 * Counts the total number of products based on filters.
 * @param filters - The filter criteria.
 * @returns The total count.
 */
async function countProducts(filters: ProductFilters): Promise<number> {
  const provider = await getProductDataProvider();
  const productRepository = await resolveProductRepository(provider);
  const count = await productRepository.countProducts(filters);

  const fallbackProvider = getFallbackProvider(provider);
  const compareFallbackProvider = await shouldCompareFallbackProvider();
  if (!compareFallbackProvider || !isProviderAvailable(fallbackProvider)) {
    return count;
  }

  const fallbackRepository = await resolveProductRepository(fallbackProvider);
  const fallbackCount = await fallbackRepository.countProducts(filters);
  if (fallbackCount > count) {
    await logSystemEvent({
      level: 'warn',
      message:
        '[products] Primary provider has fewer matching rows; using fallback provider count.',
      context: {
        primaryProvider: provider,
        fallbackProvider,
        primaryCount: count,
        fallbackCount,
        filters,
      },
    });
    return fallbackCount;
  }
  return count;
}

/**
 * Retrieves a single product by its ID.
 * @param id - The ID of the product to retrieve.
 * @returns The product, or null if not found.
 */
async function getProductById(id: string): Promise<ProductWithImages | null> {
  const provider = await getProductDataProvider();
  const productRepository = await resolveProductRepository(provider);
  const product = await productRepository.getProductById(id);
  if (product) return product;

  const policy = await getDatabaseEnginePolicy();
  if (!policy.allowAutomaticFallback) {
    return null;
  }

  const fallbackProvider = getFallbackProvider(provider);
  if (!isProviderAvailable(fallbackProvider)) {
    return null;
  }
  const fallbackRepository = await resolveProductRepository(fallbackProvider);
  return fallbackRepository.getProductById(id);
}

async function getProductBySku(sku: string): Promise<ProductWithImages | null> {
  const provider = await getProductDataProvider();
  const productRepository = await resolveProductRepository(provider);
  let product = await productRepository.getProductBySku(sku);

  if (!product) {
    const policy = await getDatabaseEnginePolicy();
    if (!policy.allowAutomaticFallback) {
      return null;
    }

    const fallbackProvider = getFallbackProvider(provider);
    if (isProviderAvailable(fallbackProvider)) {
      const fallbackRepository = await resolveProductRepository(fallbackProvider);
      product = await fallbackRepository.getProductBySku(sku);
    }
  }

  if (!product) return null;
  return getProductById(product.id);
}

/**
 * Creates a new product.
 * @param formData - The product data from the form.
 * @param options - Optional context like userId for logging.
 * @returns The newly created product.
 */
async function createProduct(
  formData: FormData,
  options?: { userId?: string }
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo('Creating product...');
  let createdProductId: string | null = null;
  const uploadedImageFileIds: string[] = [];

  try {
    const { 
      rawData, 
      images, 
      imageFileIds, 
      catalogIds, 
      categoryId, 
      tagIds, 
      producerIds, 
      noteIds 
    } = parseProductForm(formData);

    const validationResult = await validateProductCreate(rawData, true);
    
    if (!validationResult.success) {
      throw badRequestError('Validation failed', { 
        errors: validationResult.errors 
      });
    }
    
    const validatedData = validationResult.data;
    await ErrorSystem.logInfo('Validated data', { validatedData });
    const productRepository = await resolveProductRepository();
    const product = await productRepository.createProduct(validatedData);
    createdProductId = product.id;

    // Track newly uploaded images for compensation
    if (images.length > 0) {
      for (const image of images) {
        const uploadedImage = await uploadFile(image, {
          category: 'products',
          sku: validatedData.sku,
        });
        uploadedImageFileIds.push(uploadedImage.id);
      }
    }

    const allImageIds = [...imageFileIds, ...uploadedImageFileIds];
    if (allImageIds.length > 0) {
      await productRepository.addProductImages(product.id, allImageIds);
    }

    await updateProductCatalogs(product.id, catalogIds);
    await updateProductCategory(product.id, categoryId);
    await updateProductTags(product.id, tagIds);
    await updateProductProducers(product.id, producerIds);
    await updateProductNotes(product.id, noteIds);

    const fullProduct = await getProductById(product.id);
    
    if (fullProduct) {
      void logActivity({
        type: ActivityTypes.PRODUCT.CREATED,
        description: `Created product ${fullProduct.sku || fullProduct.id}`,
        userId: options?.userId ?? null,
        entityId: fullProduct.id,
        entityType: 'product',
        metadata: { sku: fullProduct.sku }
      }).catch(() => {});
    }

    return fullProduct;
  } catch (error) {
    // Compensation logic
    if (createdProductId) {
      await ErrorSystem.logWarning(`Cleaning up partially created product ${createdProductId} due to error.`);
      const productRepository = await resolveProductRepository();
      await productRepository.deleteProduct(createdProductId).catch(() => {});
    }
    
    if (uploadedImageFileIds.length > 0) {
      await ErrorSystem.logWarning(`Cleaning up ${uploadedImageFileIds.length} uploaded images due to error.`);
      const imageFileRepository = await resolveImageFileRepository();
      for (const fileId of uploadedImageFileIds) {
        await imageFileRepository.deleteImageFile(fileId).catch(() => {});
      }
    }

    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'createProduct',
    });
    throw error;
  }
}

/**
 * Updates an existing product.
 * @param id - The ID of the product to update.
 * @param formData - The updated product data from the form.
 * @param options - Optional context like userId for logging.
 * @returns The updated product, or null if not found.
 */
async function updateProduct(
  id: string,
  formData: FormData,
  options?: { userId?: string }
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo(`Updating product ${id}...`);
  try {
    const { 
      rawData, 
      images, 
      imageFileIds, 
      catalogIds, 
      categoryId, 
      tagIds, 
      producerIds, 
      noteIds 
    } = parseProductForm(formData);

    const validationResult = await validateProductUpdate(rawData, true);

    if (!validationResult.success) {
      throw badRequestError('Validation failed', { 
        errors: validationResult.errors 
      });
    }

    const validatedData = validationResult.data;
    await ErrorSystem.logInfo('Validated data', { validatedData });
    const productRepository = await resolveProductRepository();
    const updatedProduct = await productRepository.updateProduct(
      id,
      validatedData,
    );
    if (!updatedProduct) return null;

    await linkImagesToProduct(id, images, imageFileIds, validatedData.sku, {
      mode: 'replace',
    });
    if (validatedData.sku) {
      await moveLinkedTempImagesToSku(id, validatedData.sku);
    }

    // Only update catalogs/categories/tags if explicitly provided in formData
    if (formData.has('catalogIds')) {
      await updateProductCatalogs(id, catalogIds);
    }
    if (formData.has('categoryId')) {
      await updateProductCategory(id, categoryId);
    }
    if (formData.has('tagIds')) {
      await updateProductTags(id, tagIds);
    }
    if (formData.has('producerIds')) {
      await updateProductProducers(id, producerIds);
    }
    if (formData.has('noteIds')) {
      await updateProductNotes(id, noteIds);
    }

    const fullProduct = await getProductById(updatedProduct.id);
    
    if (fullProduct) {
      void logActivity({
        type: ActivityTypes.PRODUCT.UPDATED,
        description: `Updated product ${fullProduct.sku || fullProduct.id}`,
        userId: options?.userId ?? null,
        entityId: fullProduct.id,
        entityType: 'product',
        metadata: { sku: fullProduct.sku, changes: validatedData }
      }).catch(() => {});
    }

    return fullProduct;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'updateProduct',
      productId: id,
    });
    throw error;
  }
}

/**
 * Deletes a product.
 * @param id - The ID of the product to delete.
 * @param options - Optional context like userId for logging.
 * @returns The deleted product, or null if not found.
 */
async function deleteProduct(id: string, options?: { userId?: string }): Promise<ProductRecord | null> {
  await ErrorSystem.logInfo(`Deleting product ${id}...`);
  try {
    const productRepository = await resolveProductRepository();
    const deletedProduct = await productRepository.deleteProduct(id);
    
    if (deletedProduct) {
      void logActivity({
        type: ActivityTypes.PRODUCT.DELETED,
        description: `Deleted product ${deletedProduct.sku || deletedProduct.id}`,
        userId: options?.userId ?? null,
        entityId: deletedProduct.id,
        entityType: 'product',
        metadata: { sku: deletedProduct.sku }
      }).catch(() => {});
    }
    
    return deletedProduct;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'deleteProduct',
      productId: id,
    });
    throw error;
  }
}

/**
 * Duplicates a product without images and with a new SKU.
 * @param id - The ID of the product to duplicate.
 * @param sku - The new SKU for the duplicated product.
 * @param options - Optional context like userId for logging.
 * @returns The duplicated product, or null if not found.
 */
async function duplicateProduct(
  id: string,
  sku: string,
  options?: { userId?: string }
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo(`Duplicating product ${id} with new SKU ${sku}...`);
  try {
    const trimmedSku = typeof sku === 'string' ? sku.trim() : '';
    if (!trimmedSku) {
      throw badRequestError('SKU is required', { field: 'sku' });
    }
    
    const productRepository = await resolveProductRepository();
    const duplicatedProduct = await productRepository.duplicateProduct(
      id,
      trimmedSku,
    );
    if (!duplicatedProduct) return null;
    
    const fullProduct = await getProductById(duplicatedProduct.id);
    
    if (fullProduct) {
      void logActivity({
        type: ActivityTypes.PRODUCT.DUPLICATED,
        description: `Duplicated product ${id} to new SKU ${trimmedSku}`,
        userId: options?.userId ?? null,
        entityId: fullProduct.id,
        entityType: 'product',
        metadata: { sourceId: id, newSku: trimmedSku }
      }).catch(() => {});
    }

    return fullProduct;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'duplicateProduct',
      productId: id,
      newSku: sku,
    });
    throw error;
  }
}

/**
 * Unlinks an image from a product.
 * @param productId - The ID of the product.
 * @param imageFileId - The ID of the image file.
 * @returns The result of the deletion.
 */
// Why: Images may be linked to multiple products. Only delete the physical file
// and folder after confirming no other products reference this image. This prevents
// accidental data loss if the same image is reused and orphaned disk directories
// from cluttering the storage.
async function unlinkImageFromProduct(
  productId: string,
  imageFileId: string,
): Promise<null> {
  try {
    const productRepository = await resolveProductRepository();
    const imageFileRepository = await resolveImageFileRepository();
    await productRepository.removeProductImage(productId, imageFileId);
    const remainingLinks =
      await productRepository.countProductsByImageFileId(imageFileId);

    if (remainingLinks === 0) {
      const imageFile = await imageFileRepository.getImageFileById(imageFileId);

      if (imageFile) {
        const isExternal = /^(https?:|data:)/i.test(imageFile.filepath);
        if (!isExternal) {
          try {
            await fs.unlink(getDiskPathFromPublicPath(imageFile.filepath));
          } catch (error: unknown) {
            if (
              error instanceof Error &&
              (error as NodeJS.ErrnoException).code !== 'ENOENT'
            ) {
              await ErrorSystem.logWarning('Failed to unlink image file', {
                filepath: imageFile.filepath,
                error: error instanceof Error ? error.message : String(error)
              });
              // Continue to delete the DB record even if file unlink failed (orphaned file is better than broken DB link)
            }
          }
        }

        await imageFileRepository.deleteImageFile(imageFileId).catch(() => {});

        if (!isExternal) {
          const folderDiskPath = path.dirname(
            getDiskPathFromPublicPath(imageFile.filepath),
          );
          if (
            folderDiskPath.startsWith(
              path.join(process.cwd(), 'public', 'uploads', 'products'),
            )
          ) {
            try {
              const folderContents = await fs.readdir(folderDiskPath);
              if (folderContents.length === 0) {
                await fs.rmdir(folderDiskPath);
              }
            } catch (error: unknown) {
              if (
                error instanceof Error &&
                (error as NodeJS.ErrnoException).code !== 'ENOENT'
              ) {
                await ErrorSystem.logWarning('Failed to remove image folder', {
                  folderPath: folderDiskPath,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'unlinkImageFromProduct',
      productId,
      imageFileId,
    });
    throw error;
  }
}

/**
 * Links images to a product. This includes uploading new images and linking existing ones.
 * @param productId - The ID of the product.
 * @param images - The new image files to upload.
 * @param imageFileIds - The IDs of the existing image files to link.
 */
async function linkImagesToProduct(
  productId: string,
  images: File[],
  imageFileIds: string[],
  productSku?: string | null,
  options?: { mode?: 'append' | 'replace' },
): Promise<void> {
  const productRepository = await resolveProductRepository();
  const mode = options?.mode ?? 'append';
  const allImageFileIds = [...imageFileIds];

  if (images.length > 0) {
    for (const image of images) {
      // Filter out empty file inputs
      if (image.size > 0) {
        const uploadedImage = await uploadFile(image, {
          category: 'products',
          sku: productSku,
        });
        allImageFileIds.push(uploadedImage.id);
      }
    }
  }

  if (productSku && imageFileIds.length > 0) {
    await moveTempImageFilesToSku(imageFileIds, productSku);
  }

  if (mode === 'replace') {
    await productRepository.replaceProductImages(productId, allImageFileIds);
    return;
  }

  if (allImageFileIds.length > 0) {
    await productRepository.addProductImages(productId, allImageFileIds);
  }
}

// Why: HTML form's getAll("catalogIds") returns entries for EACH selected item.
// Normalize to trim whitespace (user selection artifacts) and filter empty strings
// (unchecked checkboxes). This prevents invalid IDs from entering the database.
function normalizeCatalogIds(entries: FormDataEntryValue[]): string[] {
  return entries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);
}

function normalizeCategoryId(formData: FormData): string | null {
  const direct = formData.get('categoryId');
  if (typeof direct === 'string') {
    const trimmed = direct.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeTagIds(entries: FormDataEntryValue[]): string[] {
  return entries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);
}

function normalizeProducerIds(entries: FormDataEntryValue[]): string[] {
  return entries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);
}

function normalizeNoteIds(entries: FormDataEntryValue[]): string[] {
  return entries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);
}

async function updateProductCatalogs(
  productId: string,
  catalogIds: string[],
): Promise<void> {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductCatalogs(productId, catalogIds);

  // Why: Products need a default price group for inventory/listing calculations.
  // Auto-assigning from the first assigned catalog prevents incomplete product state.
  // Only sets it if the product doesn't already have one to preserve manual overrides.
  const firstCatalogId = catalogIds[0];
  if (firstCatalogId) {
    const product = await productRepository.getProductById(productId);
    if (product && !product.defaultPriceGroupId) {
      const catalogRepository = await getCatalogRepository();
      const catalog = await catalogRepository.getCatalogById(firstCatalogId);
      if (catalog?.defaultPriceGroupId) {
        await productRepository.updateProduct(productId, {
          defaultPriceGroupId: catalog.defaultPriceGroupId,
        });
      }
    }
  }
}

async function updateProductCategory(
  productId: string,
  categoryId: string | null,
): Promise<void> {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductCategory(productId, categoryId);
}

async function updateProductTags(
  productId: string,
  tagIds: string[],
): Promise<void> {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductTags(productId, tagIds);
}

async function updateProductProducers(
  productId: string,
  producerIds: string[],
): Promise<void> {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductProducers(productId, producerIds);
}

async function updateProductNotes(
  productId: string,
  noteIds: string[],
): Promise<void> {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductNotes(productId, noteIds);
}

// Why: Temp path allows users to upload images before saving a product. Once a
// SKU is assigned, we permanently organize images by SKU for easy product recovery.
// Sanitization (replacing non-alphanumeric with underscore) prevents path injection
// and filesystem-specific naming issues across different OS environments.
async function moveTempImageFilesToSku(
  imageFileIds: string[],
  sku: string,
): Promise<void> {
  try {
    const imageFileRepository = await resolveImageFileRepository();
    const imageFiles =
      await imageFileRepository.findImageFilesByIds(imageFileIds);

    for (const imageFile of imageFiles) {
      if (!imageFile.filepath.startsWith(tempProductPathPrefix)) {
        continue;
      }

      const filename = imageFile.filepath.slice(tempProductPathPrefix.length);
      const safeSku = sku.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
      const targetPublicDir = `/uploads/products/${safeSku}`;
      const targetPublicPath = `${targetPublicDir}/${filename}`;

      try {
        await fs.mkdir(
          path.join(process.cwd(), 'public', 'uploads', 'products', safeSku),
          { recursive: true },
        );
        await fs.rename(
          getDiskPathFromPublicPath(imageFile.filepath),
          getDiskPathFromPublicPath(targetPublicPath),
        );

        await imageFileRepository.updateImageFilePath(
          imageFile.id,
          targetPublicPath,
        );
      } catch (fileError) {
        await ErrorSystem.logWarning(`Failed to move temp image for SKU ${sku}`, {
          imageId: imageFile.id,
          sourcePath: imageFile.filepath,
          error: fileError instanceof Error ? fileError.message : String(fileError)
        });
        // Continue loop to try moving other images
      }
    }
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'productService',
      action: 'moveTempImageFilesToSku',
      sku,
      imageFileIdsCount: imageFileIds.length
    });
    // Don't throw, just log. This is a maintenance task and shouldn't fail the user request if possible.
  }
}

async function moveLinkedTempImagesToSku(
  productId: string,
  sku: string,
): Promise<void> {
  const productRepository = await resolveProductRepository();
  const product = await productRepository.getProductById(productId);
  const imageFileIds =
    product?.images
      .filter((image: ProductImageRecord): boolean =>
        image.imageFile.filepath.startsWith(tempProductPathPrefix),
      )
      .map((image: ProductImageRecord): string => image.imageFileId) ?? [];
  if (imageFileIds.length > 0) {
    await moveTempImageFilesToSku(imageFileIds, sku);
  }
}

export const productService = {
  getProducts,
  countProducts,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  unlinkImageFromProduct,
};
