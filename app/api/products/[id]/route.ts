import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: Request, { params }: RouteParams): Promise<NextResponse<Product | null>> {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(product);
}

interface PutRequestBody {
  name: string;
  price: number;
}

export async function PUT(req: Request, { params }: RouteParams): Promise<NextResponse<Product>> {
  const { name, price }: PutRequestBody = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: { name, price },
  });
  return NextResponse.json(product);
}

export async function DELETE(req: Request, { params }: RouteParams): Promise<NextResponse<void>> {
  await prisma.product.delete({
    where: { id: params.id },
  });
  return new NextResponse(null, { status: 204 });
}
