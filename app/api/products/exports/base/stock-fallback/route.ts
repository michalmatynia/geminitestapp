import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const requestSchema = z.object({
  enabled: z.boolean(),
});

export async function GET(req: Request) {
  try {
    const enabled = await getExportStockFallbackEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "exports.base.stock-fallback.GET",
      fallbackMessage: "Failed to fetch stock fallback setting.",
    });
  }
}

export async function POST(req: Request) {
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
      source: "exports.base.stock-fallback.POST",
      fallbackMessage: "Failed to save setting",
    });
  }
}
