import { PrismaClient, Product, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request): Promise<NextResponse<Product[] | { error: string }>> {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: Prisma.ProductWhereInput = {};

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
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

interface PostRequestBody {
  name: string;
  price: number;
}

export async function POST(req: Request): Promise<NextResponse<Product | { error: string }>> {
  const { name, price }: PostRequestBody = await req.json();

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: "Product name cannot be empty" }, { status: 400 });
  }

  if (price === undefined || price <= 0) {
    return NextResponse.json({ error: "Product price must be a positive number" }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: { name, price },
    });
    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}