import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validations/product';
import { handleProductImageUpload } from '@/lib/utils/productUtils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
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
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params, prisma: prismaClient }: { params: { id: string }; prisma?: PrismaClient }
): Promise<NextResponse<Product | { error: string }>> {
  console.log(`Received PUT request to /api/products/${params.id}`);
  const prisma = prismaClient || new PrismaClient();
  const { id } = await params;
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const sku = formData.get("sku") as string;
    const description = formData.get("description") as string | null;
    const image: File | null = formData.get("image") as unknown as File;
    const imageFileId = formData.get("imageFileId") as string | null;

    console.log("Validating product data...");
    const validatedData = productSchema.parse({
      name,
      price,
      sku,
      description,
    });
    console.log("Product data validated successfully:", validatedData);

    console.log("Updating product in database...");
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: validatedData.name,
          price: validatedData.price,
          sku: validatedData.sku,
          description: validatedData.description,
        },
      });
      console.log("Product updated successfully:", product);

      if (image) {
        console.log("Uploading product image...");
        const uploadedImageInfo = await handleProductImageUpload(image);
        if (uploadedImageInfo) {
          console.log("Creating image file in database...");
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
          console.log("Image file created successfully:", newImageFile);

          console.log("Creating product image relation in database...");
          await tx.productImage.create({
            data: {
              productId: product.id,
              imageFileId: newImageFile.id,
            },
          });
          console.log("Product image relation created successfully.");
        }
      } else if (imageFileId) {
        console.log("Creating product image relation in database...");
        await tx.productImage.create({
          data: {
            productId: product.id,
            imageFileId: imageFileId,
          },
        });
        console.log("Product image relation created successfully.");
      }

      console.log("Fetching product with images...");
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
    console.log("Product with images fetched successfully:", updatedProduct);

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    if (error instanceof Error && "issues" in error) {
      console.error("Zod validation error:", error);
      return NextResponse.json(
        { error: JSON.parse(error.message) },
        { status: 400 }
      );
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params, prisma: prismaClient }: { params: { id: string }; prisma?: PrismaClient }
) {
  console.log(`Received DELETE request to /api/products/${params.id}`);
  const prisma = prismaClient || new PrismaClient();
  const { id } = params;

  try {
    console.log("Deleting product from database...");
    await prisma.product.delete({
      where: { id },
    });
    console.log("Product deleted successfully.");

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
