import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product | null>> {
  const { id } = await Promise.resolve(params);
  const product = await prisma.product.findUnique({
    where: { id },
  });
  return NextResponse.json(product);
}

interface PutRequestBody {
  name: string;
  price: number;
}

export async function PUT(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Product>> {
  const { id } = await Promise.resolve(params);
  const { name, price }: PutRequestBody = await req.json();
  const product = await prisma.product.update({
    where: { id },
    data: { name, price },
  });
  return NextResponse.json(product);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<void>> {
  const { id } = await Promise.resolve(params);
  await prisma.product.delete({
    where: { id },
  });
  return new NextResponse(null, { status: 204 });
}
