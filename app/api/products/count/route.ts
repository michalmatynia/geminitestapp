import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

/**
 * GET /api/products/count
 * Returns the total number of products based on filters.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  try {
    const count = await productService.countProducts(filters);
    return NextResponse.json({ count });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][count][GET] Failed to fetch product count", {
      errorId,
      error,
      filters,
    });
    return NextResponse.json(
      { error: "Failed to fetch product count", errorId },
      { status: 500 }
    );
  }
}
