import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportActiveTemplateId,
  setExportActiveTemplateId,
} from "@/features/integrations";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products";
import { apiHandler } from "@/shared/lib/api/api-handler";

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

async function GET_handler(req: Request) {
  try {
    const templateId = await getExportActiveTemplateId();
    return NextResponse.json({ templateId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.active-template.GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "exports.base.active-template.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setExportActiveTemplateId(data.templateId ?? null);
    return NextResponse.json({ templateId: data.templateId ?? null });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.active-template.POST",
      fallbackMessage: "Failed to save template",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.exports.base.active-template.GET" });
export const POST = apiHandler(POST_handler, { source: "products.exports.base.active-template.POST" });
