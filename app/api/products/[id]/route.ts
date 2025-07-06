import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';
import { handleProductImageUpload, validateProductInput } from '@/lib/utils/productUtils';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product | { error: string } | null>> {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
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

export async function PUT(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product | { error: string }>> {
  const { id } = await params;
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const image: File | null = formData.get('image') as unknown as File;

    const validationError = validateProductInput(name, price);
    if (validationError) {
      return validationError;
    }

    const uploadedImageInfo = await handleProductImageUpload(image);

    const product = await prisma.product.update({
      where: { id },
      data: { name, price },
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
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<void | { error: string }>> {
  const { id } = await params;
  try {
    await prisma.product.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error deleting product:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}