import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getImportLastTemplateId,
  setImportLastTemplateId,
} from "@/lib/services/import-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { apiHandler } from "@/lib/api/api-handler";

const requestSchema = z.object({
  templateId: z.string().trim().min(1).optional(),
});

async function GET_handler(req: Request) {
  try {
    const templateId = await getImportLastTemplateId();
    return NextResponse.json({ templateId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.last-template.GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "imports.base.last-template.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setImportLastTemplateId(data.templateId ?? null);
    return NextResponse.json({ templateId: data.templateId ?? null });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.last-template.POST",
      fallbackMessage: "Failed to save template",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.imports.base.last-template.GET" });
export const POST = apiHandler(POST_handler, { source: "products.imports.base.last-template.POST" });
