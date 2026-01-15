import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { productService } from "@/lib/services/productService";
import { parseJsonBody } from "@/lib/api/parse-json";

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
      const errorId = randomUUID();
      console.error("[products][DUPLICATE] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }
    const parsed = await parseJsonBody(req, duplicateSchema, {
      logPrefix: "products-duplicate",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const sku = parsed.data.sku ?? "";
    const product = await productService.duplicateProduct(id, sku);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][DUPLICATE] Product not found", {
        errorId,
        productId,
      });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[products][DUPLICATE] Failed to duplicate product", {
        errorId,
        productId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[products][DUPLICATE] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
