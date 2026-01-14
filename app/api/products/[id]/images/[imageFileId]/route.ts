import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";

type Params = { id: string; imageFileId: string };
type Ctx = { params: Promise<Params> } | { params: Params };

async function getParams(ctx: Ctx): Promise<Params> {
  return await Promise.resolve((ctx as any).params);
}

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  let productId: string | undefined;
  let imageFileId: string | undefined;

  try {
    const p = await getParams(ctx);
    productId = p.id;
    imageFileId = p.imageFileId;

    // This should never happen for this route shape, but keep the guard + logging
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
      productId,
      imageFileId,
    });
    return NextResponse.json(
      { error: "Failed to disconnect image", errorId },
      { status: 500 }
    );
  }
}
