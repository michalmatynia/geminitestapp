import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets,
} from "@/lib/services/export-template-repository";
import { normalizeImageRetryPresets } from "@/lib/constants/image-retry-presets";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

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

export async function GET(req: Request) {
  try {
    const presets = await getExportImageRetryPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "exports.base.image-retry-presets.GET",
      fallbackMessage: "Failed to fetch image retry presets.",
    });
  }
}

export async function POST(req: Request) {
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
      source: "exports.base.image-retry-presets.POST",
      fallbackMessage: "Failed to save presets",
    });
  }
}
