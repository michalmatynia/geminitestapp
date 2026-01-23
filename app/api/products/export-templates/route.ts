import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createExportTemplate,
  listExportTemplates,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).default([]),
  exportImagesAsBase64: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const templates = await listExportTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "export-templates.GET",
      fallbackMessage: "Failed to fetch templates.",
    });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, templateSchema, {
      logPrefix: "export-templates.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const template = await createExportTemplate({
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
      ...(data.exportImagesAsBase64 !== undefined && { exportImagesAsBase64: data.exportImagesAsBase64 }),
    });
    return NextResponse.json(template);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "export-templates.POST",
      fallbackMessage: "Failed to create template.",
    });
  }
}
