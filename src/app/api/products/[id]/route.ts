export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { getProductRepository } from "@/features/products/services/product-repository";
import { z } from "zod";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { validateProductUpdateMiddleware } from "@/features/products/validations/middleware";

/**
 * GET /api/products/[id]
 * Fetches a single product by its ID.
 */
async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  if (!id) {
    throw badRequestError("Product id is required");
  }

  const product = await productService.getProductById(id);
  if (!product) {
    throw notFoundError("Product not found", { productId: id });
  }

  return NextResponse.json(product);
}

/**
 * PUT /api/products/[id]
 * Updates an existing product with validation.
 */
async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  if (!id) {
    throw badRequestError("Product id is required");
  }
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    throw badRequestError("Invalid form data payload", {
      productId: id,
      error,
    });
  }

  // Validate the form data
  const validation = await validateProductUpdateMiddleware(formData);
  if (!validation.success) {
    return validation.response;
  }

  const product = await productService.updateProduct(id, formData);
  if (!product) {
    throw notFoundError("Product not found", { productId: id });
  }
  return NextResponse.json(product);
}

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/products/[id]
 * Partially updates a product (for quick field edits like price/stock).
 */
async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  if (!id) {
    throw badRequestError("Product id is required");
  }

  const parsed = await parseJsonBody(req, patchProductSchema, {
    logPrefix: "products.PATCH",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const updateData: { price?: number; stock?: number } = {};
  if (data.price !== undefined) updateData.price = data.price;
  if (data.stock !== undefined) updateData.stock = data.stock;

  const productRepository = await getProductRepository();
  const product = await productRepository.updateProduct(id, updateData);
  if (!product) {
    throw notFoundError("Product not found", { productId: id });
  }

  return NextResponse.json(product);
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  if (!id) {
    throw badRequestError("Product id is required");
  }
  const product = await productService.deleteProduct(id);
  if (!product) {
    throw notFoundError("Product not found", { productId: id });
  }
  return new Response(null, { status: 204 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: "products.[id].GET",
});
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "products.[id].PUT",
});
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: "products.[id].PATCH",
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "products.[id].DELETE",
});
