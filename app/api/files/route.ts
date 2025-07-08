import { PrismaClient, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const prisma = new PrismaClient();
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");

  try {
    const where: Prisma.ImageFileWhereInput = {};

    if (filename) {
      where.filename = {
        contains: filename,
      };
    }

    if (productId) {
      where.products = {
        some: {
          productId,
        },
      };
    }

    if (productName) {
      where.products = {
        some: {
          product: {
            name: {
              contains: productName,
            },
          },
        },
      };
    }

    const files = await prisma.imageFile.findMany({
      where,
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}