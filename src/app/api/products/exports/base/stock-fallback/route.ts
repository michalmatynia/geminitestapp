import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { apiHandler } from "@/lib/api/api-handler";

const requestSchema = z.object({
  enabled: z.boolean(),
});

async function GET_handler(req: Request) {
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

async function POST_handler(req: Request) {
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

export const GET = apiHandler(GET_handler, { source: "products.exports.base.stock-fallback.GET" });
export const POST = apiHandler(POST_handler, { source: "products.exports.base.stock-fallback.POST" });
