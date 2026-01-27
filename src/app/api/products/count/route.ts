import { NextResponse } from "next/server";
import { productService } from "@/features/products/services/productService";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/products/count
 * Returns the total number of products based on filters.
 */
async function GET_handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  try {
    const count = await productService.countProducts(filters);
    return NextResponse.json({ count });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.count.GET",
      fallbackMessage: "Failed to fetch product count",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.count.GET" });
