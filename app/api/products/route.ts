import { NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/services/productService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  try {
    const products = await getProducts(filters);
    return NextResponse.json(products);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const product = await createProduct(formData);
    return NextResponse.json(product);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 400 });
  }
}

