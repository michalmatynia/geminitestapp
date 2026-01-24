import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteExportTemplate,
  getExportTemplate,
  updateExportTemplate,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

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

async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      source: "export-templates.GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

async function PUT_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      source: "export-templates.PUT",
      fallbackMessage: "Failed to update template.",
    });
  }
}

async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      source: "export-templates.DELETE",
      fallbackMessage: "Failed to delete template.",
    });
  }
}

export const GET = apiHandlerWithParams<any>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].GET" });
export const PUT = apiHandlerWithParams<any>(async (req, _ctx, params) => PUT_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].PUT" });
export const DELETE = apiHandlerWithParams<any>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "products.export-templates.[id].DELETE" });
