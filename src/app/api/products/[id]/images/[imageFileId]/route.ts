export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { productService } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; imageFileId: string }): Promise<Response> {
  let productId: string | undefined;
  let imageFileId: string | undefined;

  try {
    productId = params.id;
    imageFileId = params.imageFileId;

    // This should never happen for this route shape, but keep the guard + logging
    if (!productId || !imageFileId) {
      throw badRequestError("Product id and image file id are required", {
        productId,
        imageFileId,
      });
    }

    await productService.unlinkImageFromProduct(productId, imageFileId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.[id].images.[imageFileId].DELETE",
      fallbackMessage: "Failed to disconnect image",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(DELETE_handler, { source: "products.[id].images.[imageFileId].DELETE" });
