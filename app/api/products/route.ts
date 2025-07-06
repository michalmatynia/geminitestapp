import { PrismaClient, Product } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request): Promise<NextResponse<Product[]>> {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
    ];
  }

  if (minPrice) {
    where.price = { ...where.price, gte: parseFloat(minPrice) };
  }

  if (maxPrice) {
    where.price = { ...where.price, lte: parseFloat(maxPrice) };
  }

  if (startDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
  }

  if (endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  }

  try {
    const products = await prisma.product.findMany({
      where,
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

interface PostRequestBody {
  name: string;
  price: number;
}

export async function POST(req: Request): Promise<NextResponse<Product>> {
  const { name, price }: PostRequestBody = await req.json();
  const product = await prisma.product.create({
    data: { name, price },
  });
  return NextResponse.json(product);
}
