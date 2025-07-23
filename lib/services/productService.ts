import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { uploadFile } from "@/lib/utils/fileUploader";

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

async function updateProduct(id: string, formData: FormData) {
  const productExists = await prisma.product.findUnique({ where: { id } });
  if (!productExists) return null;

  const validatedData = productSchema.parse(
    Object.fromEntries(formData.entries())
  );
  console.log("Validated data:", validatedData);
  await prisma.product.update({
    where: { id },
    data: validatedData,
  });

  const images = formData.getAll("images") as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];
  await linkImagesToProduct(id, images, imageFileIds);

  return await getProductById(id);
}

async function deleteProduct(id: string) {
  const productExists = await prisma.product.findUnique({ where: { id } });
  if (!productExists) return null;
  return await prisma.product.delete({ where: { id } });
}

async function unlinkImageFromProduct(productId: string, imageFileId: string) {
  return await prisma.productImage.delete({
    where: { productId_imageFileId: { productId, imageFileId } },
  });
}

async function linkImagesToProduct(
  productId: string,
  images: File[],
  imageFileIds: string[]
) {
  console.log("Linking images:", { productId, images, imageFileIds });
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
