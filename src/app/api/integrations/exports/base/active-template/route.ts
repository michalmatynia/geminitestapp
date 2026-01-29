import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportActiveTemplateId,
  setExportActiveTemplateId,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.exports.base.active-template.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.exports.base.active-template.POST" });
