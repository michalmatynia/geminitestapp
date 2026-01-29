import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets,
} from "@/features/integrations/server";
import { normalizeImageRetryPresets } from "@/features/data-import-export";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const transformSchema = z.object({
  forceJpeg: z.boolean().optional(),
  maxDimension: z.number().int().positive().optional(),
  jpegQuality: z.number().int().min(10).max(100).optional(),
});

const presetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  imageBase64Mode: z.enum(["base-only", "full-data-uri"]).optional(),
  transform: transformSchema,
});

const requestSchema = z.object({
  presets: z.array(presetSchema).min(1),
});

async function GET_handler(req: NextRequest): Promise<Response> {
  try {
    const presets = await getExportImageRetryPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.image-retry-presets.GET",
      fallbackMessage: "Failed to fetch image retry presets.",
    });
  }
}

async function POST_handler(req: NextRequest): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "exports.base.image-retry-presets.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const normalized = normalizeImageRetryPresets(data.presets);
    await setExportImageRetryPresets(normalized);
    return NextResponse.json({ presets: normalized });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.image-retry-presets.POST",
      fallbackMessage: "Failed to save presets",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.exports.base.image-retry-presets.GET" });
export const POST = apiHandler(POST_handler, { source: "products.exports.base.image-retry-presets.POST" });
