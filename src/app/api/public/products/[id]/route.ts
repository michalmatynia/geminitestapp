import { NextResponse } from "next/server";
import { productService } from "@/features/products/services/productService";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

/**
 * GET /api/public/products/[id]
 * Fetches a single product by its ID for public consumption.
 */
async function GET_handler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await productService.getProductById(id);
    if (!product) {
      return createErrorResponse(notFoundError("Product not found"), {
        source: "public.products.[id].GET",
      });
    }
    return NextResponse.json(product);
  } catch (_error) {
    return createErrorResponse(_error, {
      source: "public.products.[id].GET",
      fallbackMessage: "Failed to fetch product",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "public.products.[id].GET" });
