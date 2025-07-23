// This service encapsulates all business logic for managing products.

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { uploadFile } from "@/lib/utils/fileUploader";

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
    name: {
      contains: filters.search,
    },
    sku: {
      contains: filters.sku,
    },
  };

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
    },
  });
}

/**
 * Creates a new product.
 * @param formData - The product data from the form.
 * @returns The newly created product.
 */
async function createProduct(formData: FormData) {
  const validatedData = productSchema.parse(
    Object.fromEntries(formData.entries())
  );
  const product = await prisma.product.create({
    data: validatedData,
  });

  const images = formData.getAll("images") as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];
  await linkImagesToProduct(product.id, images, imageFileIds);

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

  const validatedData = productSchema.parse(
    Object.fromEntries(formData.entries())
  );
  await prisma.product.update({
    where: { id },
    data: validatedData,
  });

  const images = formData.getAll("images") as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];
  await linkImagesToProduct(id, images, imageFileIds);

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
 * Unlinks an image from a product.
 * @param productId - The ID of the product.
 * @param imageFileId - The ID of the image file.
 * @returns The result of the deletion.
 */
async function unlinkImageFromProduct(productId: string, imageFileId: string) {
  return await prisma.productImage.delete({
    where: { productId_imageFileId: { productId, imageFileId } },
  });
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
  imageFileIds: string[]
) {
  const allImageFileIds = [...imageFileIds];

  if (images.length > 0) {
    for (const image of images) {
      // Filter out empty file inputs
      if (image.size > 0) {
        const uploadedImage = await uploadFile(image);
        allImageFileIds.push(uploadedImage.id);
      }
    }
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

export const productService = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  unlinkImageFromProduct,
};
