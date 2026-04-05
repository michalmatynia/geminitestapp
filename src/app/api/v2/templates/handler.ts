import { NextRequest, NextResponse } from 'next/server';

import {
  createExportTemplate,
  deleteExportTemplate,
  listExportTemplates,
  createImportTemplate,
  deleteImportTemplate,
  listImportTemplates,
  updateExportTemplate,
  updateImportTemplate,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { createImportExportTemplateSchema } from '@/shared/contracts/integrations/import-export';
import { type ImportExportTemplateCreateInput } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function GET_templates_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  if (type === 'export') {
    const templates = await listExportTemplates();
    return NextResponse.json(templates);
  }
  if (type === 'import') {
    const templates = await listImportTemplates();
    return NextResponse.json(templates);
  }
  throw badRequestError(`Invalid template type: ${type}`);
}

export async function POST_templates_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const parsed = await parseJsonBody(req, createImportExportTemplateSchema, {
    logPrefix: `templates.${type}.POST`,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data: ImportExportTemplateCreateInput = parsed.data;

  if (type === 'export') {
    const template = await createExportTemplate({
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
      ...(data.exportImagesAsBase64 !== undefined && {
        exportImagesAsBase64: data.exportImagesAsBase64,
      }),
    });
    return NextResponse.json(template);
  }

  if (type === 'import') {
    const template = await createImportTemplate({
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
      ...(data.parameterImport ? { parameterImport: data.parameterImport } : {}),
    });
    return NextResponse.json(template);
  }

  throw badRequestError(`Invalid template type: ${type}`);
}

export async function PUT_templates_item_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const parsed = await parseJsonBody(req, createImportExportTemplateSchema, {
    logPrefix: `templates.${type}.PUT`,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data: ImportExportTemplateCreateInput = parsed.data;

  if (type === 'export') {
    const template = await updateExportTemplate(id, {
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
      ...(data.exportImagesAsBase64 !== undefined && {
        exportImagesAsBase64: data.exportImagesAsBase64,
      }),
    });
    if (!template) {
      throw notFoundError(`Export template not found: ${id}`, { templateId: id });
    }
    return NextResponse.json(template);
  }

  if (type === 'import') {
    const template = await updateImportTemplate(id, {
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
      ...(data.parameterImport ? { parameterImport: data.parameterImport } : {}),
    });
    if (!template) {
      throw notFoundError(`Import template not found: ${id}`, { templateId: id });
    }
    return NextResponse.json(template);
  }

  throw badRequestError(`Invalid template type: ${type}`);
}

export async function DELETE_templates_item_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'export') {
    const deleted = await deleteExportTemplate(id);
    if (!deleted) {
      throw notFoundError(`Export template not found: ${id}`, { templateId: id });
    }
    return NextResponse.json({ success: true });
  }

  if (type === 'import') {
    const deleted = await deleteImportTemplate(id);
    if (!deleted) {
      throw notFoundError(`Import template not found: ${id}`, { templateId: id });
    }
    return NextResponse.json({ success: true });
  }

  throw badRequestError(`Invalid template type: ${type}`);
}
