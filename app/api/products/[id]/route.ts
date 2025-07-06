import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, price } = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: { name, price },
  });
  return NextResponse.json(product);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await prisma.product.delete({
    where: { id: params.id },
  });
  return new Response(null, { status: 204 });
}
