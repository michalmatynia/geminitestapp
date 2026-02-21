import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteImportTemplate,
  getImportTemplate,
  updateImportTemplate
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { removeUndefined } from '@/shared/utils';

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1)
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
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).optional(),
  parameterImport: parameterImportSchema.optional(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Template id is required');
  }
  const template = await getImportTemplate(id);
  if (!template) {
    throw notFoundError('Template not found.', { templateId: id });
  }
  return NextResponse.json(template);
}

export async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Template id is required');
  }
  const parsed = await parseJsonBody(req, templateSchema, {
    logPrefix: 'import-templates.PUT'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const template = await updateImportTemplate(id, removeUndefined({
    name: data.name,
    description: data.description,
    mappings: data.mappings,
    parameterImport: data.parameterImport,
  }));
  if (!template) {
    throw notFoundError('Template not found.', { templateId: id });
  }
  return NextResponse.json(template);
}

export async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Template id is required');
  }
  const deleted = await deleteImportTemplate(id);
  if (!deleted) {
    throw notFoundError('Template not found.', { templateId: id });
  }
  return NextResponse.json({ ok: true });
}
