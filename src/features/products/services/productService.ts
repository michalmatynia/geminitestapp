import 'server-only';

// This service encapsulates all business logic for managing products.

import fs from 'fs/promises';
import path from 'path';

import { getDiskPathFromPublicPath, uploadFile } from '@/features/files/server';
import { getImageFileRepository } from '@/features/files/server';
import type { ImageFileRepository } from '@/features/files/types/services/image-file-repository';
import { ErrorSystem } from '@/features/observability/server';
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

const resolveProductRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ProductRepository> =>
  getProductRepository(providerOverride);
const resolveImageFileRepository = async (): Promise<ImageFileRepository> =>
  getImageFileRepository();

/**
 * Retrieves a list of products based on the provided filters.
 * @param filters - The filter criteria.
 * @returns A list of products.
 */
const shouldLogTiming = (): boolean => process.env.DEBUG_API_TIMING === 'true';

type ProductQueryTimings = Record<string, number | null | undefined>;

async function getProducts(
  filters: ProductFilters,
  options?: { timings?: ProductQueryTimings; provider?: ProductDbProvider }
): Promise<ProductWithImages[]> {
  const timings = options?.timings;
  const totalStart = performance.now();
  const provider = options?.provider ?? await getProductDataProvider();
  const productRepository = await resolveProductRepository(provider);

  const repoStart = performance.now();
  const products = await productRepository.getProducts(filters);
  const repoMs = performance.now() - repoStart;
  if (timings) {
    timings.repo = repoMs;
  }
  performanceMonitor.record('db.query', repoMs, { operation: 'getProducts', provider });

  const imagesStart = performance.now();
  let fsChecks = 0;

  const result = await Promise.all(
    products.map(
      async (product: ProductWithImages): Promise<ProductWithImages> => {
        if (!product.images?.length) {
          return product;
        }

        const filteredImages = await Promise.all(
          product.images.map(
            async (
              image: ProductImageRecord,
            ): Promise<ProductImageRecord | null> => {
              const filepath = image.imageFile?.filepath;
              if (!filepath) {
                return null;
              }

              if (/^(https?:|data:)/i.test(filepath)) {
                return image;
              }

              try {
                fsChecks += 1;
                await fs.access(getDiskPathFromPublicPath(filepath));
                return image;
              } catch (error) {
                // Log warning but don't fail the request. The image record exists but file is missing.
                void ErrorSystem.logWarning(`Missing image file: ${filepath}`, {
                  service: 'productService',
                  action: 'getProducts',
                  filepath,
                  error: error instanceof Error ? error.message : String(error)
                });
                return null;
              }            },
          ),
        );

        return {
          ...product,
          images: filteredImages.filter(
            (img: ProductImageRecord | null): img is ProductImageRecord =>
              img !== null,
          ),
        };
      },
    ),
  );
  const imagesMs = performance.now() - imagesStart;
  if (timings) {
    timings.images = imagesMs;
    timings.fsChecks = fsChecks;
    timings.total = performance.now() - totalStart;
  }
  if (shouldLogTiming()) {
    console.log('[timing] productService.getProducts', {
      provider,
      repoMs: Math.round(repoMs),
      imagesMs: Math.round(imagesMs),
      fsChecks,
      totalMs: Math.round(performance.now() - totalStart),
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
  const productRepository = await resolveProductRepository();
  return productRepository.countProducts(filters);
}

/**
 * Retrieves a single product by its ID.
 * @param id - The ID of the product to retrieve.
 * @returns The product, or null if not found.
 */
async function getProductById(id: string): Promise<ProductWithImages | null> {
  const productRepository = await resolveProductRepository();
  return productRepository.getProductById(id);
}

async function getProductBySku(sku: string): Promise<ProductWithImages | null> {
  const productRepository = await resolveProductRepository();
  const product = await productRepository.getProductBySku(sku);
  if (!product) return null;
  return getProductById(product.id);
}

/**
 * Creates a new product.
 * @param formData - The product data from the form.
 * @returns The newly created product.
 */
async function createProduct(
  formData: FormData,
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo('Creating product...');
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validationResult = await validateProductCreate(rawData, true);
    
    if (!validationResult.success) {
      throw badRequestError('Validation failed', { 
        errors: validationResult.errors 
      });
    }
    
    const validatedData = validationResult.data as any; // Cast to expected type after successful validation
    await ErrorSystem.logInfo('Validated data', { validatedData });
    const productRepository = await resolveProductRepository();
    const product = await productRepository.createProduct(validatedData);

    const images = formData.getAll('images') as File[];
    const imageFileIds = formData.getAll('imageFileIds') as string[];
    const catalogIds = normalizeCatalogIds(formData.getAll('catalogIds'));
    const categoryId = normalizeCategoryId(formData);
    const tagIds = normalizeTagIds(formData.getAll('tagIds'));
    const producerIds = normalizeProducerIds(formData.getAll('producerIds'));
    const noteIds = normalizeNoteIds(formData.getAll('noteIds'));
    await linkImagesToProduct(
      product.id,
      images,
      imageFileIds,
      validatedData.sku,
      { mode: 'append' },
    );
    await updateProductCatalogs(product.id, catalogIds);
    await updateProductCategory(product.id, categoryId);
    await updateProductTags(product.id, tagIds);
    await updateProductProducers(product.id, producerIds);
    await updateProductNotes(product.id, noteIds);

    return await getProductById(product.id);
  } catch (error) {
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
 * @returns The updated product, or null if not found.
 */
async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo(`Updating product ${id}...`);
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validationResult = await validateProductUpdate(rawData, true);

    if (!validationResult.success) {
      throw badRequestError('Validation failed', { 
        errors: validationResult.errors 
      });
    }

    const validatedData = validationResult.data as any;
    await ErrorSystem.logInfo('Validated data', { validatedData });
    const productRepository = await resolveProductRepository();
    const updatedProduct = await productRepository.updateProduct(
      id,
      validatedData,
    );
    if (!updatedProduct) return null;

    const images = formData.getAll('images') as File[];
    const imageFileIds = formData.getAll('imageFileIds') as string[];
    await linkImagesToProduct(id, images, imageFileIds, validatedData.sku, {
      mode: 'replace',
    });
    if (validatedData.sku) {
      await moveLinkedTempImagesToSku(id, validatedData.sku);
    }

    // Only update catalogs/categories/tags if explicitly provided in formData
    if (formData.has('catalogIds')) {
      const catalogIds = normalizeCatalogIds(formData.getAll('catalogIds'));
      await updateProductCatalogs(id, catalogIds);
    }
    if (formData.has('categoryId') || formData.has('categoryIds')) {
      const categoryId = normalizeCategoryId(formData);
      await updateProductCategory(id, categoryId);
    }
    if (formData.has('tagIds')) {
      const tagIds = normalizeTagIds(formData.getAll('tagIds'));
      await updateProductTags(id, tagIds);
    }
    if (formData.has('producerIds')) {
      const producerIds = normalizeProducerIds(formData.getAll('producerIds'));
      await updateProductProducers(id, producerIds);
    }
    if (formData.has('noteIds')) {
      const noteIds = normalizeNoteIds(formData.getAll('noteIds'));
      await updateProductNotes(id, noteIds);
    }

    return await getProductById(updatedProduct.id);
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
 * @returns The deleted product, or null if not found.
 */
async function deleteProduct(id: string): Promise<ProductRecord | null> {
  await ErrorSystem.logInfo(`Deleting product ${id}...`);
  try {
    const productRepository = await resolveProductRepository();
    return await productRepository.deleteProduct(id);
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
 * @returns The duplicated product, or null if not found.
 */
async function duplicateProduct(
  id: string,
  sku: string,
): Promise<ProductWithImages | null> {
  await ErrorSystem.logInfo(`Duplicating product ${id} with new SKU ${sku}...`);
  try {
    const trimmedSku = sku.trim();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!trimmedSku) {
      throw badRequestError('SKU is required', { field: 'sku' });
    }
    if (!skuPattern.test(trimmedSku)) {
      throw badRequestError('SKU must use uppercase letters and numbers only', {
        field: 'sku',
        value: trimmedSku,
      });
    }

    const productRepository = await resolveProductRepository();
    const duplicatedProduct = await productRepository.duplicateProduct(
      id,
      trimmedSku,
    );
    if (!duplicatedProduct) return null;
    return await getProductById(duplicatedProduct.id);
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
        const isExternal = /^https?:\/\//i.test(imageFile.filepath);
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

        await imageFileRepository.deleteImageFile(imageFileId);

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

const tempProductPathPrefix = '/uploads/products/temp/';

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
    return null;
  }
  const legacyEntries = formData.getAll('categoryIds');
  const normalized = legacyEntries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);
  return normalized[0] ?? null;
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
