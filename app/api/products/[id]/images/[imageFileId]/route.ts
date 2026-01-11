import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id?: string; imageFileId?: string } }
) {
  try {
    const productId = params?.id ?? "";
    const imageFileId = params?.imageFileId ?? "";
    if (!productId || !imageFileId) {
      const errorId = randomUUID();
      console.error("[products][IMAGES][DELETE] Missing params", {
        errorId,
        productId,
        imageFileId,
      });
      return NextResponse.json(
        { error: "Product id and image file id are required", errorId },
        { status: 400 }
      );
    }
    await productService.unlinkImageFromProduct(productId, imageFileId);
    return new Response(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][IMAGES][DELETE] Failed to disconnect image", {
      errorId,
      error,
      productId: params?.id,
      imageFileId: params?.imageFileId,
    });
    return NextResponse.json(
      { error: "Failed to disconnect image", errorId },
      { status: 500 }
    );
  }
}
