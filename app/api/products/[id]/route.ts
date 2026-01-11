import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

/**
 * PUT /api/products/[id]
 * Updates an existing product.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][PUT] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[products][PUT] Failed to parse form data", {
        errorId,
        error,
        productId: id,
      });
      return NextResponse.json(
        { error: "Invalid form data payload", errorId },
        { status: 400 }
      );
    }
    const product = await productService.updateProduct(id, formData);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][PUT] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[products][PUT] Failed to update product", {
        errorId,
        productId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[products][PUT] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][DELETE] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }
    const product = await productService.deleteProduct(id);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][DELETE] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][DELETE] Failed to delete product", {
      errorId,
      error,
      productId,
    });
    return NextResponse.json(
      { error: "Failed to delete product", errorId },
      { status: 500 }
    );
  }
}
