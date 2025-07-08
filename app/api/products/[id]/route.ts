import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validations/product';
import { handleProductImageUpload } from '@/lib/utils/productUtils';

export async function GET(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  const prisma = new PrismaClient();
  const { id } = params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          include: {
            imageFile: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: any
): Promise<NextResponse> {
  const prisma = new PrismaClient();
  const { id } = params;
  try {
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
    const image: File | null = formData.get("image") as unknown as File;
    const imageFileId = formData.get("imageFileId") as string | null;

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

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
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

      if (image) {
        const uploadedImageInfo = await handleProductImageUpload(image);
        if (uploadedImageInfo) {
          const newImageFile = await tx.imageFile.create({
            data: {
              filename: image.name,
              filepath: uploadedImageInfo.filepath,
              mimetype: image.type,
              size: image.size,
              width: uploadedImageInfo.width,
              height: uploadedImageInfo.height,
            },
          });

          await tx.productImage.create({
            data: {
              productId: product.id,
              imageFileId: newImageFile.id,
            },
          });
        }
      } else if (imageFileId) {
        await tx.productImage.create({
          data: {
            productId: product.id,
            imageFileId: imageFileId,
          },
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: {
              assignedAt: "desc",
            },
            include: {
              imageFile: true,
            },
          },
        },
      });
    });

    if (!updatedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(updatedProduct);
  } catch (_error: unknown) {
    const error = _error as { code?: string; issues?: { message: string }[] };
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (error.issues) {
      return NextResponse.json(
        { error: JSON.stringify(error.issues) },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: any
) {
  const prisma = new PrismaClient();
  const { id } = params;

  try {
    await prisma.product.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (_error: unknown) {
    const error = _error as { code?: string };
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
