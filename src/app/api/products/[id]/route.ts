import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { z } from "zod";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";

/**
 * GET /api/products/[id]
 * Fetches a single product by its ID.
 */
async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Product id is required");
    }

    const product = await productService.getProductById(id);
    if (!product) {
      throw notFoundError("Product not found", { productId: id });
    }

    return NextResponse.json(product);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/products/[id]",
      method: "GET",
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.[id].GET",
      fallbackMessage: "Failed to fetch product",
    });
  }
}

/**
 * PUT /api/products/[id]
 * Updates an existing product.
 */
async function PUT_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
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
    const product = await productService.updateProduct(id, formData);
    if (!product) {
      throw notFoundError("Product not found", { productId: id });
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    await ErrorSystem.captureException(error, {
      service: "api/products/[id]",
      method: "PUT",
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.[id].PUT",
      fallbackMessage: "Failed to update product",
    });
  }
}

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/products/[id]
 * Partially updates a product (for quick field edits like price/stock).
 */
async function PATCH_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
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

    // Use productService to update specific fields
    const updateData = new FormData();
    if (data.price !== undefined) {
      updateData.append("price", String(data.price));
    }
    if (data.stock !== undefined) {
      updateData.append("stock", String(data.stock));
    }

    const product = await productService.updateProduct(id, updateData);
    if (!product) {
      throw notFoundError("Product not found", { productId: id });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    await ErrorSystem.captureException(error, {
      service: "api/products/[id]",
      method: "PATCH",
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.[id].PATCH",
      fallbackMessage: "Failed to update product",
    });
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
async function DELETE_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Product id is required");
    }
    const product = await productService.deleteProduct(id);
    if (!product) {
      throw notFoundError("Product not found", { productId: id });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/products/[id]",
      method: "DELETE",
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.[id].DELETE",
      fallbackMessage: "Failed to delete product",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    GET_handler(req, { params: Promise.resolve(params) }),
  { source: "products.[id].GET" }
);
export const PUT = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    PUT_handler(req, { params: Promise.resolve(params) }),
  { source: "products.[id].PUT" }
);
export const PATCH = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    PATCH_handler(req, { params: Promise.resolve(params) }),
  { source: "products.[id].PATCH" }
);
export const DELETE = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    DELETE_handler(req, { params: Promise.resolve(params) }),
  { source: "products.[id].DELETE" }
);