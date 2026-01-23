import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getExportImageRetryPresets,
  setExportImageRetryPresets,
} from "@/lib/services/export-template-repository";
import { normalizeImageRetryPresets } from "@/lib/constants/image-retry-presets";

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

export async function GET() {
  try {
    const presets = await getExportImageRetryPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    const errorId = randomUUID();
    console.error(
      "[base-export-image-presets][GET] Failed to fetch presets",
      {
        errorId,
        error,
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch image retry presets.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    const normalized = normalizeImageRetryPresets(data.presets);
    await setExportImageRetryPresets(normalized);
    return NextResponse.json({ presets: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[base-export-image-presets][POST] Failed to save presets",
      {
        errorId,
        message,
      }
    );
    return NextResponse.json({ error: message, errorId }, { status: 500 });
  }
}
