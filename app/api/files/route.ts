import { PrismaClient, ImageFile, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

type ImageFileWithProducts = ImageFile & {
  products: { product: { id: string; name: string } }[];
};

export async function GET(req: Request): Promise<NextResponse<ImageFileWithProducts[] | { error: string }>> {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename') || '';
  const productId = searchParams.get('productId') || '';
  const productName = searchParams.get('productName') || '';

  const where: Prisma.ImageFileWhereInput = {};

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
      select: {
        id: true,
        filename: true,
        filepath: true,
        mimetype: true,
        size: true,
        width: true,
        height: true,
        createdAt: true,
        updatedAt: true,
        products: {
          include: {
            product: true,
          },
        },
      },
    });
    return NextResponse.json(imageFiles as ImageFileWithProducts[]);
  } catch (error: unknown) {
    console.error("Error fetching image files:", error);
    return NextResponse.json({ error: "Failed to fetch image files" }, { status: 500 });
  }
}

