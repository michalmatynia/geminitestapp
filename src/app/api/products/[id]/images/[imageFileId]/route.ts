import { NextRequest } from "next/server";
import { productService } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

type Params = { id: string; imageFileId: string };
type Ctx = { params: Params | Promise<Params> };

async function getParams(ctx: Ctx): Promise<Params> {
  return await Promise.resolve(ctx.params);
}

/**
 * DELETE /api/products/[id]/images/[imageFileId]
 * Unlinks an image from a product.
 */
async function DELETE_handler(req: NextRequest, ctx: Ctx): Promise<Response> {
  let productId: string | undefined;
  let imageFileId: string | undefined;

  try {
    const p = await getParams(ctx);
    productId = p.id;
    imageFileId = p.imageFileId;

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

export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { id: string; imageFileId: string }): Promise<Response> => async (req: NextRequest(req, { params: Promise.resolve(params) }),
 _ctx: ApiHandlerContext, params: { id: string; imageFileId: string }): Promise<Response> => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "products.[id].images.[imageFileId].DELETE" });
