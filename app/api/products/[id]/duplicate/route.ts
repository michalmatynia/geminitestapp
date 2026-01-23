import { NextResponse } from "next/server";
import { z } from "zod";
import { productService } from "@/lib/services/productService";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

const duplicateSchema = z.object({
  sku: z.string().trim().optional(),
});

/**
 * POST /api/products/[id]/duplicate
 * Duplicates a product with a new SKU.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
