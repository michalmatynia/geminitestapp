import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { handleProductImageUpload } from "@/lib/utils/productUtils";
import { productSchema } from "@/lib/validations/product";

// This function retrieves a list of products based on the provided filters.
export async function getProducts(filters: {
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: Prisma.ProductWhereInput = {
    name: {
      contains: filters.search,
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

// This function retrieves a single product by its ID.
export async function getProductById(id: string) {
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

// This function creates a new product.
export async function createProduct(formData: FormData) {
  console.log("Creating product with formData:", Object.fromEntries(formData.entries()));
  const validatedData = productSchema.parse({
    name: formData.get("name"),
    price: parseFloat(formData.get("price") as string),
    sku: formData.get("sku"),
    description: formData.get("description"),
    supplierName: formData.get("supplierName"),
    supplierLink: formData.get("supplierLink"),
    priceComment: formData.get("priceComment"),
    stock: formData.get("stock")
      ? parseInt(formData.get("stock") as string, 10)
      : null,
    sizeLength: formData.get("sizeLength")
      ? parseInt(formData.get("sizeLength") as string, 10)
      : null,
    sizeWidth: formData.get("sizeWidth")
      ? parseInt(formData.get("sizeWidth") as string, 10)
      : null,
  });

  const product = await prisma.product.create({
    data: validatedData,
  });

  const images: File[] = formData.getAll("images") as unknown as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];

  await linkImagesToProduct(product.id, images, imageFileIds);

  return await getProductById(product.id);
}

// This function updates an existing product.
export async function updateProduct(id: string, formData: FormData) {
  const productExists = await prisma.product.findUnique({
    where: { id },
  });

  if (!productExists) {
    return null;
  }
  console.log(`Updating product ${id} with formData:`, Object.fromEntries(formData.entries()));
  const validatedData = productSchema.parse({
    name: formData.get("name"),
    price: parseFloat(formData.get("price") as string),
    sku: formData.get("sku"),
    description: formData.get("description"),
    supplierName: formData.get("supplierName"),
    supplierLink: formData.get("supplierLink"),
    priceComment: formData.get("priceComment"),
    stock: formData.get("stock")
      ? parseInt(formData.get("stock") as string, 10)
      : null,
    sizeLength: formData.get("sizeLength")
      ? parseInt(formData.get("sizeLength") as string, 10)
      : null,
    sizeWidth: formData.get("sizeWidth")
      ? parseInt(formData.get("sizeWidth") as string, 10)
      : null,
  });

  await prisma.product.update({
    where: { id },
    data: validatedData,
  });

  const images: File[] = formData.getAll("images") as unknown as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];

  await linkImagesToProduct(id, images, imageFileIds);

  return await getProductById(id);
}

// This function deletes a product.
export async function deleteProduct(id: string) {
  const productExists = await prisma.product.findUnique({
    where: { id },
  });

  if (!productExists) {
    return null;
  }
  return await prisma.product.delete({
    where: { id },
  });
}

// This function unlinks an image from a product.
export async function unlinkImageFromProduct(
  productId: string,
  imageFileId: string
) {
  return await prisma.productImage.delete({
    where: {
      productId_imageFileId: {
        productId,
        imageFileId,
      },
    },
  });
}

// This is a helper function to link images to a product.
async function linkImagesToProduct(
  productId: string,
  images: File[],
  imageFileIds: string[]
) {
  if (images.length > 0) {
    for (const image of images) {
      const uploadedImageInfo = await handleProductImageUpload(image);
      if (uploadedImageInfo) {
        const newImageFile = await prisma.imageFile.create({
          data: {
            filename: image.name,
            filepath: uploadedImageInfo.filepath,
            mimetype: image.type,
            size: image.size,
            width: uploadedImageInfo.width,
            height: uploadedImageInfo.height,
          },
        });

        await prisma.productImage.create({
          data: {
            productId: productId,
            imageFileId: newImageFile.id,
          },
        });
      }
    }
  }

  if (imageFileIds.length > 0) {
    for (const imageFileId of imageFileIds) {
      await prisma.productImage.create({
        data: {
          productId: productId,
          imageFileId: imageFileId,
        },
      });
    }
  }
}
