import { logger } from "@/lib/logger";
// This service encapsulates all business logic for managing products.

import fs from "fs/promises";
import path from "path";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations/product";
import { getDiskPathFromPublicPath, uploadFile } from "@/lib/utils/fileUploader";
import { getProductRepository } from "@/lib/services/product-repository";
import type { ProductFilters } from "@/types/services/product-repository";
import { getImageFileRepository } from "@/lib/services/image-file-repository";

const resolveProductRepository = async () => getProductRepository();
const resolveImageFileRepository = async () => getImageFileRepository();

/**
 * Retrieves a list of products based on the provided filters.
 * @param filters - The filter criteria.
 * @returns A list of products.
 */
async function getProducts(filters: ProductFilters) {
  console.log("[productService] getProducts filters:", filters);
  const productRepository = await resolveProductRepository();
  const products = await productRepository.getProducts(filters);

  return Promise.all(
    products.map(async (product) => {
      if (!product.images?.length) {
        return product;
      }

      const filteredImages = await Promise.all(
        product.images.map(async (image) => {
          const filepath = image.imageFile?.filepath;
          if (!filepath) {
            return null;
          }

          if (/^(https?:|data:)/i.test(filepath)) {
            return image;
          }

          try {
            await fs.access(getDiskPathFromPublicPath(filepath));
            return image;
          } catch {
            return null;
          }
        })
      );

      return {
        ...product,
        images: filteredImages.filter(Boolean),
      };
    })
  );
}

/**
 * Counts the total number of products based on filters.
 * @param filters - The filter criteria.
 * @returns The total count.
 */
async function countProducts(filters: ProductFilters) {
  const productRepository = await resolveProductRepository();
  return productRepository.countProducts(filters);
}

/**
 * Retrieves a single product by its ID.
 * @param id - The ID of the product to retrieve.
 * @returns The product, or null if not found.
 */
async function getProductById(id: string) {
  const productRepository = await resolveProductRepository();
  return productRepository.getProductById(id);
}

/**
 * Creates a new product.
 * @param formData - The product data from the form.
 * @returns The newly created product.
 */
async function createProduct(formData: FormData) {
  logger.log("Creating product...");
  try {
    const validatedData = productCreateSchema.parse(
      Object.fromEntries(formData.entries())
    );
    logger.log("Validated data:", validatedData);
    const productRepository = await resolveProductRepository();
    const product = await productRepository.createProduct(validatedData);

    const images = formData.getAll("images") as File[];
    const imageFileIds = formData.getAll("imageFileIds") as string[];
    const catalogIds = normalizeCatalogIds(formData.getAll("catalogIds"));
    await linkImagesToProduct(
      product.id,
      images,
      imageFileIds,
      validatedData.sku
    );
    await updateProductCatalogs(product.id, catalogIds);

    return await getProductById(product.id);
  } catch (error) {
    logger.error("Error creating product:", error);
    throw error;
  }
}

/**
 * Updates an existing product.
 * @param id - The ID of the product to update.
 * @param formData - The updated product data from the form.
 * @returns The updated product, or null if not found.
 */
async function updateProduct(id: string, formData: FormData) {
  logger.log(`Updating product ${id}...`);
  try {
    const validatedData = productUpdateSchema.parse(
      Object.fromEntries(formData.entries())
    );
    logger.log("Validated data:", validatedData);
    const productRepository = await resolveProductRepository();
    const updatedProduct = await productRepository.updateProduct(
      id,
      validatedData
    );
    if (!updatedProduct) return null;

    const images = formData.getAll("images") as File[];
    const imageFileIds = formData.getAll("imageFileIds") as string[];
    const catalogIds = normalizeCatalogIds(formData.getAll("catalogIds"));
    await linkImagesToProduct(id, images, imageFileIds, validatedData.sku);
    if (validatedData.sku) {
      await moveLinkedTempImagesToSku(id, validatedData.sku);
    }
    await updateProductCatalogs(id, catalogIds);

    return await getProductById(updatedProduct.id);
  } catch (error) {
    logger.error("Error updating product:", error);
    throw error;
  }
}

/**
 * Deletes a product.
 * @param id - The ID of the product to delete.
 * @returns The deleted product, or null if not found.
 */
async function deleteProduct(id: string) {
  logger.log(`Deleting product ${id}...`);
  try {
    const productRepository = await resolveProductRepository();
    return await productRepository.deleteProduct(id);
  } catch (error) {
    logger.error("Error deleting product:", error);
    throw error;
  }
}

/**
 * Duplicates a product without images and with a new SKU.
 * @param id - The ID of the product to duplicate.
 * @param sku - The new SKU for the duplicated product.
 * @returns The duplicated product, or null if not found.
 */
async function duplicateProduct(id: string, sku: string) {
  logger.log(`Duplicating product ${id} with new SKU ${sku}...`);
  try {
    const trimmedSku = sku.trim();
    const skuPattern = /^[A-Z0-9]+$/;
    if (!trimmedSku) {
      throw new Error("SKU is required");
    }
    if (!skuPattern.test(trimmedSku)) {
      throw new Error("SKU must use uppercase letters and numbers only");
    }

    const productRepository = await resolveProductRepository();
    const duplicatedProduct = await productRepository.duplicateProduct(
      id,
      trimmedSku
    );
    if (!duplicatedProduct) return null;
    return await getProductById(duplicatedProduct.id);
  } catch (error) {
    logger.error("Error duplicating product:", error);
    throw error;
  }
}

/**
 * Unlinks an image from a product.
 * @param productId - The ID of the product.
 * @param imageFileId - The ID of the image file.
 * @returns The result of the deletion.
 */
async function unlinkImageFromProduct(productId: string, imageFileId: string) {
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
          if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
      }

      await imageFileRepository.deleteImageFile(imageFileId);

      if (!isExternal) {
        const folderDiskPath = path.dirname(
          getDiskPathFromPublicPath(imageFile.filepath)
        );
        if (folderDiskPath.startsWith(path.join(process.cwd(), "public", "uploads", "products"))) {
          try {
            const folderContents = await fs.readdir(folderDiskPath);
            if (folderContents.length === 0) {
              await fs.rmdir(folderDiskPath);
            }
          } catch (error: unknown) {
            if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
              throw error;
            }
          }
        }
      }
    }
  }

  return null;
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
  productSku?: string | null
) {
  const productRepository = await resolveProductRepository();
  const allImageFileIds = [...imageFileIds];

  if (images.length > 0) {
    for (const image of images) {
      // Filter out empty file inputs
      if (image.size > 0) {
        const uploadedImage = await uploadFile(image, {
          category: "products",
          sku: productSku,
        });
        allImageFileIds.push(uploadedImage.id);
      }
    }
  }

  if (productSku && imageFileIds.length > 0) {
    await moveTempImageFilesToSku(imageFileIds, productSku);
  }

  if (allImageFileIds.length > 0) {
    await productRepository.addProductImages(productId, allImageFileIds);
  }
}

const tempProductPathPrefix = "/uploads/products/temp/";

function normalizeCatalogIds(entries: FormDataEntryValue[]) {
  return entries
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

async function updateProductCatalogs(productId: string, catalogIds: string[]) {
  const productRepository = await resolveProductRepository();
  await productRepository.replaceProductCatalogs(productId, catalogIds);
}

async function moveTempImageFilesToSku(imageFileIds: string[], sku: string) {
  const imageFileRepository = await resolveImageFileRepository();
  const imageFiles = await imageFileRepository.findImageFilesByIds(
    imageFileIds
  );

  for (const imageFile of imageFiles) {
    if (!imageFile.filepath.startsWith(tempProductPathPrefix)) {
      continue;
    }

    const filename = imageFile.filepath.slice(tempProductPathPrefix.length);
    const safeSku = sku.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
    const targetPublicDir = `/uploads/products/${safeSku}`;
    const targetPublicPath = `${targetPublicDir}/${filename}`;

    await fs.mkdir(
      path.join(process.cwd(), "public", "uploads", "products", safeSku),
      { recursive: true }
    );
    await fs.rename(
      getDiskPathFromPublicPath(imageFile.filepath),
      getDiskPathFromPublicPath(targetPublicPath)
    );

    await imageFileRepository.updateImageFilePath(
      imageFile.id,
      targetPublicPath
    );
  }
}

async function moveLinkedTempImagesToSku(productId: string, sku: string) {
  const productRepository = await resolveProductRepository();
  const product = await productRepository.getProductById(productId);
  const imageFileIds =
    product?.images
      .filter((image) =>
        image.imageFile.filepath.startsWith(tempProductPathPrefix)
      )
      .map((image) => image.imageFileId) ?? [];
  if (imageFileIds.length > 0) {
    await moveTempImageFilesToSku(imageFileIds, sku);
  }
}

export const productService = {
  getProducts,
  countProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  unlinkImageFromProduct,
};
