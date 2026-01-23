import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getImportActiveTemplateId,
  setImportActiveTemplateId,
} from "@/lib/services/import-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const templateId = await getImportActiveTemplateId();
    return NextResponse.json({ templateId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "imports.base.active-template.GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "imports.base.active-template.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setImportActiveTemplateId(data.templateId ?? null);
    return NextResponse.json({ templateId: data.templateId ?? null });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "imports.base.active-template.POST",
      fallbackMessage: "Failed to save template",
    });
  }
}
