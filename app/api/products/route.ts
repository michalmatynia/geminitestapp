import { PrismaClient, Product, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validations/product';
import { handleProductImageUpload } from '@/lib/utils/productUtils';

export async function GET(req: Request) {
  const prisma = new PrismaClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const where: Prisma.ProductWhereInput = {
      name: {
        contains: search,
      },
    };

    if (minPrice) {
      where.price = { ...where.price as Prisma.IntFilter, gte: parseInt(minPrice, 10) };
    }
    if (maxPrice) {
      where.price = { ...where.price as Prisma.IntFilter, lte: parseInt(maxPrice, 10) };
    }
    if (startDate) {
      where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: new Date(endDate) };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse<Product | { error: string }>> {
  const prisma = new PrismaClient();
  const formData = await req.formData();
  const name = formData.get('name') as string;
  const price = parseFloat(formData.get('price') as string);
  const sku = formData.get('sku') as string;
  const description = formData.get('description') as string | null;
  const image: File | null = formData.get('image') as unknown as File;
  const imageFileId = formData.get('imageFileId') as string | null;

  try {
    const validatedData = productSchema.parse({ name, price, sku, description });

    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        price: validatedData.price,
        sku: validatedData.sku,
        description: validatedData.description,
      },
    });

    if (image) {
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
    } else if (imageFileId) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageFileId: imageFileId,
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
