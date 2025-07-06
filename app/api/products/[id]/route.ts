import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';
import { handleProductImageUpload } from '@/lib/utils/productUtils';
import { productSchema } from '@/lib/validations/product';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params, prisma: prismaClient }: { params: { id: string }, prisma?: PrismaClient }): Promise<NextResponse<Product | { error: string } | null>> {
  const prisma = prismaClient || new PrismaClient();
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            assignedAt: 'desc',
          },
          include: {
            imageFile: true,
          },
        },
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params, prisma: prismaClient }: { params: { id: string }, prisma?: PrismaClient }): Promise<NextResponse<Product | { error: string }>> {
  const prisma = prismaClient || new PrismaClient();
  const { id } = await params;
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const image: File | null = formData.get('image') as unknown as File;
    const imageFileId = formData.get('imageFileId') as string | null;

    const validatedData = productSchema.parse({ name, price });
    
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: { name: validatedData.name, price: validatedData.price },
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
              assignedAt: 'desc',
            },
            include: {
              imageFile: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json({ error: JSON.parse(error.message) }, { status: 400 });
    }
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params, prisma: prismaClient }: { params: { id: string }, prisma?: PrismaClient }): Promise<NextResponse<void | { error: string }>> {
  const prisma = prismaClient || new PrismaClient();
  const { id } = await params;
  try {
    await prisma.product.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
