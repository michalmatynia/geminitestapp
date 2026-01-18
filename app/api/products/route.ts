import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

/**
 * GET /api/products
 * Fetches a list of products with optional filters.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());
  console.log("[api/products] GET filters:", filters);

  try {
    const products = await productService.getProducts(filters);
    return NextResponse.json(products);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][GET] Failed to fetch products", {
      errorId,
      error,
      filters,
    });
    return NextResponse.json(
      { error: "Failed to fetch products", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Creates a new product.
 */
export async function POST(req: Request) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[products][POST] Failed to parse form data", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid form data payload", errorId },
        { status: 400 }
      );
    }
    const product = await productService.createProduct(formData);
    return NextResponse.json(product);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[products][POST] Failed to create product", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[products][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
