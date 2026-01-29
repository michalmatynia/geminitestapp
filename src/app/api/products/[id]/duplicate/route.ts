import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productService } from "@/features/products/server";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const duplicateSchema = z.object({
  sku: z.string().trim().optional(),
});

/**
 * POST /api/products/[id]/duplicate
 * Duplicates a product with a new SKU.
 */
async function POST_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      throw badRequestError("Product id is required");
    }
    const parsed = await parseJsonBody(req, duplicateSchema, {
      logPrefix: "products.DUPLICATE",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const sku = parsed.data.sku ?? "";
    const product = await productService.duplicateProduct(id, sku);
    if (!product) {
      throw notFoundError("Product not found", { productId });
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.DUPLICATE",
      fallbackMessage: "Failed to duplicate product",
      ...(productId ? { extra: { productId } } : {}),
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }), { source: "products.[id].duplicate.POST" });
