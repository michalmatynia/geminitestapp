import { PrismaClient, Product, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { handleProductImageUpload } from '@/lib/utils/productUtils';
import { productSchema } from '@/lib/validations/product';

const prisma = new PrismaClient();

export async function GET(req: Request, { prisma: prismaClient }: { prisma?: PrismaClient } = {}): Promise<NextResponse<Product[] | { error: string }>> {
  const prisma = prismaClient || new PrismaClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
    ];
  }

  if (minPrice) {
    where.price = { ...where.price, gte: parseFloat(minPrice) };
  }

  if (maxPrice) {
    where.price = { ...where.price, lte: parseFloat(maxPrice) };
  }

  if (startDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
  }

  if (endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
    });
    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request, { prisma: prismaClient }: { prisma?: PrismaClient } = {}): Promise<NextResponse<Product | { error: string }>> {
  const prisma = prismaClient || new PrismaClient();
  const formData = await req.formData();
  const name = formData.get('name') as string;
  const price = parseFloat(formData.get('price') as string);
  const image: File | null = formData.get('image') as unknown as File;

  try {
    const validatedData = productSchema.parse({ name, price });
    const uploadedImageInfo = await handleProductImageUpload(image);
    const product = await prisma.product.create({
      data: { name: validatedData.name, price: validatedData.price },
    });

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
    return NextResponse.json(product);
  } catch (error: unknown) {
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json({ error: JSON.parse(error.message) }, { status: 400 });
    }
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
