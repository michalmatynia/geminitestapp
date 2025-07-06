import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product | { error: string } | null>> {
  const { id } = params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

interface PutRequestBody {
  name: string;
  price: number;
}

export async function PUT(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product | { error: string }>> {
  const { id } = params;
  try {
    const { name, price }: PutRequestBody = await req.json();
    const product = await prisma.product.update({
      where: { id },
      data: { name, price },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<void | { error: string }>> {
  const { id } = params;
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