import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteExportTemplate,
  getExportTemplate,
  updateExportTemplate,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).optional(),
  exportImagesAsBase64: z.boolean().optional(),
});

async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const template = await getExportTemplate(id);
    if (!template) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json(template);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.export-templates.[id].GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

async function PUT_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const parsed = await parseJsonBody(req, templateSchema, {
      logPrefix: "export-templates.PUT",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const template = await updateExportTemplate(id, {
      name: data.name,
      description: data.description,
      mappings: data.mappings,
      exportImagesAsBase64: data.exportImagesAsBase64,
    });
    if (!template) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json(template);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.export-templates.[id].PUT",
      fallbackMessage: "Failed to update template.",
    });
  }
}

async function DELETE_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const deleted = await deleteExportTemplate(id);
    if (!deleted) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.export-templates.[id].DELETE",
      fallbackMessage: "Failed to delete template.",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].GET" });
export const PUT = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => PUT_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].DELETE" });
