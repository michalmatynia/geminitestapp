// This service encapsulates all business logic for managing products.

import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations/product";
import { getDiskPathFromPublicPath, uploadFile } from "@/lib/utils/fileUploader";

/**
 * Retrieves a list of products based on the provided filters.
 * @param filters - The filter criteria.
 * @returns A list of products.
 */
async function getProducts(filters: {
  search?: string;
  sku?: string;
  minPrice?: string;
  maxPrice?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: Prisma.ProductWhereInput = {
    sku: {
      contains: filters.sku,
    },
  };

  if (filters.search) {
    where.OR = [
      {
        name_en: {
          contains: filters.search,
        },
      },
      {
        name_pl: {
          contains: filters.search,
        },
      },
      {
        name_de: {
          contains: filters.search,
        },
      },
      {
        description_en: {
          contains: filters.search,
        },
      },
      {
        description_pl: {
          contains: filters.search,
        },
      },
      {
        description_de: {
          contains: filters.search,
        },
      },
    ];
  }

  if (filters.minPrice) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      gte: parseInt(filters.minPrice, 10),
    };
  }
  if (filters.maxPrice) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      lte: parseInt(filters.maxPrice, 10),
    };
  }
  if (filters.startDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      gte: new Date(filters.startDate),
    };
  }
  if (filters.endDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      lte: new Date(filters.endDate),
    };
  }

  return await prisma.product.findMany({
    where,
    include: {
      images: {
        include: {
          imageFile: true,
        },
      },
      catalogs: {
        include: {
          catalog: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Retrieves a single product by its ID.
 * @param id - The ID of the product to retrieve.
 * @returns The product, or null if not found.
 */
async function getProductById(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        include: {
          imageFile: true,
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
      catalogs: {
        include: {
          catalog: true,
        },
      },
    },
  });
}

/**
 * Creates a new product.
 * @param formData - The product data from the form.
 * @returns The newly created product.
 */
async function createProduct(formData: FormData) {
  const validatedData = productCreateSchema.parse(
    Object.fromEntries(formData.entries())
  );
  const product = await prisma.product.create({
    data: validatedData,
  });

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
}

/**
 * Updates an existing product.
 * @param id - The ID of the product to update.
 * @param formData - The updated product data from the form.
 * @returns The updated product, or null if not found.
 */
async function updateProduct(id: string, formData: FormData) {
  const productExists = await prisma.product.findUnique({ where: { id } });
  if (!productExists) return null;

  const validatedData = productUpdateSchema.parse(
    Object.fromEntries(formData.entries())
  );
  await prisma.product.update({
    where: { id },
    data: validatedData,
  });

  const images = formData.getAll("images") as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];
  const catalogIds = normalizeCatalogIds(formData.getAll("catalogIds"));
  await linkImagesToProduct(id, images, imageFileIds, validatedData.sku);
  if (validatedData.sku) {
    await moveLinkedTempImagesToSku(id, validatedData.sku);
  }
  await updateProductCatalogs(id, catalogIds);

  return await getProductById(id);
}

/**
 * Deletes a product.
 * @param id - The ID of the product to delete.
 * @returns The deleted product, or null if not found.
 */
async function deleteProduct(id: string) {
  const productExists = await prisma.product.findUnique({ where: { id } });
  if (!productExists) return null;
  return await prisma.product.delete({ where: { id } });
}

/**
 * Duplicates a product without images and with a new SKU.
 * @param id - The ID of the product to duplicate.
 * @param sku - The new SKU for the duplicated product.
 * @returns The duplicated product, or null if not found.
 */
async function duplicateProduct(id: string, sku: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return null;

  const trimmedSku = sku.trim();
  const skuPattern = /^[A-Z0-9]+$/;
  if (!trimmedSku) {
    throw new Error("SKU is required");
  }
  if (!skuPattern.test(trimmedSku)) {
    throw new Error("SKU must use uppercase letters and numbers only");
  }

  const existingSku = await prisma.product.findUnique({
    where: { sku: trimmedSku },
  });
  if (existingSku) {
    throw new Error("SKU already exists");
  }

  const duplicatedProduct = await prisma.product.create({
    data: {
      sku: trimmedSku,
      name_en: product.name_en,
      name_pl: product.name_pl,
      name_de: product.name_de,
      description_en: product.description_en,
      description_pl: product.description_pl,
      description_de: product.description_de,
      supplierName: product.supplierName,
      supplierLink: product.supplierLink,
      priceComment: product.priceComment,
      stock: product.stock,
      price: product.price,
      sizeLength: product.sizeLength,
      sizeWidth: product.sizeWidth,
      weight: product.weight,
      length: product.length,
    },
  });

  return await getProductById(duplicatedProduct.id);
}

/**
 * Unlinks an image from a product.
 * @param productId - The ID of the product.
 * @param imageFileId - The ID of the image file.
 * @returns The result of the deletion.
 */
async function unlinkImageFromProduct(productId: string, imageFileId: string) {
  const deletedLink = await prisma.productImage.delete({
    where: { productId_imageFileId: { productId, imageFileId } },
  });

  const remainingLinks = await prisma.productImage.count({
    where: { imageFileId },
  });

  if (remainingLinks === 0) {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id: imageFileId },
    });

    if (imageFile) {
      try {
        await fs.unlink(getDiskPathFromPublicPath(imageFile.filepath));
      } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      await prisma.imageFile.delete({
        where: { id: imageFileId },
      });

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

  return deletedLink;
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
    await prisma.productImage.createMany({
      data: allImageFileIds.map((imageFileId) => ({
        productId,
        imageFileId,
      })),
    });
  }
}

const tempProductPathPrefix = "/uploads/products/temp/";

function normalizeCatalogIds(entries: FormDataEntryValue[]) {
  return entries
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

async function updateProductCatalogs(productId: string, catalogIds: string[]) {
  await prisma.productCatalog.deleteMany({ where: { productId } });
  if (catalogIds.length === 0) return;
  const uniqueIds = Array.from(new Set(catalogIds));
  const existing = await prisma.catalog.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((entry) => entry.id));
  const validIds = uniqueIds.filter((id) => existingIds.has(id));
  if (validIds.length === 0) return;
  await prisma.productCatalog.createMany({
    data: validIds.map((catalogId) => ({
      productId,
      catalogId,
    })),
  });
}

async function moveTempImageFilesToSku(imageFileIds: string[], sku: string) {
  const imageFiles = await prisma.imageFile.findMany({
    where: {
      id: { in: imageFileIds },
    },
  });

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

    await prisma.imageFile.update({
      where: { id: imageFile.id },
      data: { filepath: targetPublicPath },
    });
  }
}

async function moveLinkedTempImagesToSku(productId: string, sku: string) {
  const imageFiles = await prisma.imageFile.findMany({
    where: {
      products: {
        some: {
          productId,
        },
      },
    },
  });

  const imageFileIds = imageFiles
    .filter((imageFile) => imageFile.filepath.startsWith(tempProductPathPrefix))
    .map((imageFile) => imageFile.id);

  if (imageFileIds.length > 0) {
    await moveTempImageFilesToSku(imageFileIds, sku);
  }
}

export const productService = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  unlinkImageFromProduct,
};
