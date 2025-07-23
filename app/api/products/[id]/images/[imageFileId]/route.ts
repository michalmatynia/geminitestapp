import { NextResponse } from "next/server";
import { productService } from "@/lib/services/productService";

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
export async function DELETE(
  req: Request,
    { params }: any
) {
  try {
    await productService.unlinkImageFromProduct(params.id, params.imageFileId);
    return new Response(null, { status: 204 });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to disconnect image" },
      { status: 500 }
    );
  }
}
