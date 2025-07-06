import { PrismaClient, ImageFile, ProductImage, Product } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request): Promise<NextResponse<ImageFile[] | { error: string }>> {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename') || '';
  const productId = searchParams.get('productId') || '';
  const productName = searchParams.get('productName') || '';

  const where: any = {};

  if (filename) {
    where.filename = { contains: filename };
  }

  if (productId) {
    where.products = {
      some: {
        productId: productId,
      },
    };
  }

  if (productName) {
    where.products = {
      some: {
        product: {
          name: { contains: productName },
        },
      },
    };
  }

  try {
    const imageFiles = await prisma.imageFile.findMany({
      where,
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });
    return NextResponse.json(imageFiles);
  } catch (error: unknown) {
    console.error("Error fetching image files:", error);
    return NextResponse.json({ error: "Failed to fetch image files" }, { status: 500 });
  }
}
