import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/public/products/[id]
 * Fetches a single product by its ID for public consumption.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    const product = await productService.getProductById(id);
    if (!product) {
      return createErrorResponse(notFoundError("Product not found"), {
        request: req,
        source: "public.products.[id].GET",
      });
    }
    return NextResponse.json(product);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "public.products.[id].GET",
      fallbackMessage: "Failed to fetch product",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> => GET_handler(req, { params: Promise.resolve(params) }),
  { source: "public.products.[id].GET" }
);
