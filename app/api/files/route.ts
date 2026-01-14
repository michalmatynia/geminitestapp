import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const filename = searchParams.get("filename")?.trim() || null;
  const productId = searchParams.get("productId")?.trim() || null;
  const productName = searchParams.get("productName")?.trim() || null;

  const and: Prisma.ImageFileWhereInput[] = [];

  if (filename) {
    and.push({
      filename: {
        contains: filename,
        mode: "insensitive",
      },
    });
  }

  if (productId) {
    and.push({
      products: {
        some: {
          productId: productId,
        },
      },
    });
  }

  if (productName) {
    and.push({
      products: {
        some: {
          product: {
            is: {
              OR: [
                { name_pl: { contains: productName, mode: "insensitive" } },
                { name_en: { contains: productName, mode: "insensitive" } },
                { name_de: { contains: productName, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    });
  }

  const where: Prisma.ImageFileWhereInput = and.length ? { AND: and } : {};

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
