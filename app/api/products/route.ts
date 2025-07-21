import { Prisma, Product } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { handleProductImageUpload } from "@/lib/utils/productUtils";
import { productSchema } from "@/lib/validations/product";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    // The `where` clause is used to filter the products based on the
    // search parameters.
    const where: Prisma.ProductWhereInput = {
      name: {
        contains: search,
      },
    };

    if (minPrice) {
      where.price = {
        ...(where.price as Prisma.IntFilter),
        gte: parseInt(minPrice, 10),
      };
    }
    if (maxPrice) {
      where.price = {
        ...(where.price as Prisma.IntFilter),
        lte: parseInt(maxPrice, 10),
      };
    }
    if (startDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        lte: new Date(endDate),
      };
    }

    const products = await prisma.product.findMany({
      where,
      // The `include` clause is used to include the related images for each
      // product.
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

    return NextResponse.json(products);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<Product | { error: string }>> {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const sku = formData.get("sku") as string;
  const description = formData.get("description") as string | null;
  const supplierName = formData.get("supplierName") as string | null;
  const supplierLink = formData.get("supplierLink") as string | null;
  const priceComment = formData.get("priceComment") as string | null;
  const stock = formData.get("stock")
    ? parseInt(formData.get("stock") as string, 10)
    : null;
  const sizeLength = formData.get("sizeLength")
    ? parseInt(formData.get("sizeLength") as string, 10)
    : null;
  const sizeWidth = formData.get("sizeWidth")
    ? parseInt(formData.get("sizeWidth") as string, 10)
    : null;
  const images: File[] = formData.getAll("images") as unknown as File[];
  const imageFileIds = formData.getAll("imageFileIds") as string[];

  try {
    const validatedData = productSchema.parse({
      name,
      price,
      sku,
      description,
      supplierName,
      supplierLink,
      priceComment,
      stock,
      sizeLength,
      sizeWidth,
    });

    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        price: validatedData.price,
        sku: validatedData.sku,
        description: validatedData.description,
        supplierName: validatedData.supplierName,
        supplierLink: validatedData.supplierLink,
        priceComment: validatedData.priceComment,
        stock: validatedData.stock,
        sizeLength: validatedData.sizeLength,
        sizeWidth: validatedData.sizeWidth,
      },
    });

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
              productId: product.id,
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
            productId: product.id,
            imageFileId: imageFileId,
          },
        });
      }
    }

    const productWithImages = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
    });

    return NextResponse.json(productWithImages as Product);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
