export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { getProductRepository } from "@/features/products/services/product-repository";
import { buildImageBase64Slots } from "@/features/products/services/image-base64";

async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id;
  if (!productId) {
    throw badRequestError("Product id is required");
  }

  const productRepo = await getProductRepository();
  const product = await productRepo.getProductById(productId);
  if (!product) {
    throw notFoundError("Product not found", { productId });
  }

  const { imageBase64s, imageLinks } = await buildImageBase64Slots(product);
  await productRepo.updateProduct(productId, { imageBase64s, imageLinks });

  return NextResponse.json({
    status: "ok",
    productId,
    count: imageBase64s.filter(Boolean).length,
  });
}

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: "products.[id].images.base64.POST",
});
