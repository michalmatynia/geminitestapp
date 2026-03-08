import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const parameterImportSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['all', 'mapped']).optional(),
  languageScope: z.enum(['catalog_languages', 'default_only']).optional(),
  createMissingParameters: z.boolean().optional(),
  overwriteExistingValues: z.boolean().optional(),
  matchBy: z.enum(['base_id_then_name', 'name_only']).optional(),
});

const templateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).default([]),
  exportImagesAsBase64: z.boolean().optional(),
  parameterImport: parameterImportSchema.optional(),
});

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
  const parsed = await parseJsonBody(req, templateSchema, {
    logPrefix: `templates.${type}.POST`,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

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
  const parsed = await parseJsonBody(req, templateSchema, {
    logPrefix: `templates.${type}.PUT`,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

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
