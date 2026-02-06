export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validateProductsBatch } from "@/features/products/validations";
import { apiHandler } from "@/shared/lib/api/api-handler";
import { badRequestError } from "@/shared/errors/app-error";
import type { ApiHandlerContext } from "@/shared/types/api";

// POST /api/products/validation - Batch validation
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const data = (await req.json()) as { products: unknown[] };
  const products = data.products;

  if (!Array.isArray(products)) {
    throw badRequestError("Products must be an array");
  }

  const result = await validateProductsBatch(products, "create");

  return NextResponse.json({
    summary: {
      total: result.summary.total,
      successful: result.summary.successful,
      failed: result.summary.failed,
    },
    results: result.results,
    globalErrors: [],
  });
}

// GET /api/products/validation - Health check
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  return NextResponse.json({
    status: "ok",
    validation: { engine: "zod-schema" },
  });
}

export const POST = apiHandler(POST_handler, {
  source: "products.validation.POST",
});

export const GET = apiHandler(GET_handler, {
  source: "products.validation.GET",
});
