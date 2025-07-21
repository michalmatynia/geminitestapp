import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");

  const where: Prisma.ImageFileWhereInput = {};

  if (filename) {
    where.filename = {
      contains: filename,
    };
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
  });

  return NextResponse.json(files);
}
