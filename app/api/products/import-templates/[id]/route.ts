import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteImportTemplate,
  getImportTemplate,
  updateImportTemplate,
} from "@/lib/services/import-template-repository";
import { removeUndefined } from "@/lib/utils";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const template = await getImportTemplate(id);
    if (!template) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json(template);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "import-templates.GET",
      fallbackMessage: "Failed to fetch template.",
    });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const parsed = await parseJsonBody(req, templateSchema, {
      logPrefix: "import-templates.PUT",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const template = await updateImportTemplate(id, removeUndefined({
      name: data.name,
      description: data.description,
      mappings: data.mappings,
    }));
    if (!template) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json(template);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "import-templates.PUT",
      fallbackMessage: "Failed to update template.",
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      throw badRequestError("Template id is required");
    }
    const deleted = await deleteImportTemplate(id);
    if (!deleted) {
      throw notFoundError("Template not found.", { templateId: id });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "import-templates.DELETE",
      fallbackMessage: "Failed to delete template.",
    });
  }
}
