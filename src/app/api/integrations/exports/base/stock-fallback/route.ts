import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  enabled: z.boolean(),
});

async function GET_handler(req: NextRequest): Promise<Response> {
  try {
    const enabled = await getExportStockFallbackEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.stock-fallback.GET",
      fallbackMessage: "Failed to fetch stock fallback setting.",
    });
  }
}

async function POST_handler(req: NextRequest): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "exports.base.stock-fallback.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setExportStockFallbackEnabled(data.enabled);
    return NextResponse.json({ enabled: data.enabled });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.stock-fallback.POST",
      fallbackMessage: "Failed to save setting",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.exports.base.stock-fallback.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.exports.base.stock-fallback.POST" });
