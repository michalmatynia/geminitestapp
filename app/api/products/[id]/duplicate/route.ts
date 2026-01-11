import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

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
    let body: { sku?: string };
    try {
      body = (await req.json()) as { sku?: string };
    } catch (error) {
      const errorId = randomUUID();
      console.error("[products][DUPLICATE] Failed to parse JSON body", {
        errorId,
        error,
        productId,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const sku = body.sku ?? "";
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
