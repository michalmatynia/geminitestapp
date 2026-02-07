export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/products/count
 * Returns the total number of products based on filters.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  const count = await productService.countProducts(filters);
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.count.GET" });
