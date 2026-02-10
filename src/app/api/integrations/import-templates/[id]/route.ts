export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteImportTemplate,
  getImportTemplate,
  updateImportTemplate
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { removeUndefined } from '@/shared/utils';

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1)
});

const templateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).optional()
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
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

async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
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
    mappings: data.mappings
  }));
  if (!template) {
    throw notFoundError('Template not found.', { templateId: id });
  }
  return NextResponse.json(template);
}

async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
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

export const GET = apiHandlerWithParams<{ id: string }>(
  GET_handler,
  { source: 'products.import-templates.[id].GET', requireCsrf: false }
);
export const PUT = apiHandlerWithParams<{ id: string }>(
  PUT_handler,
  { source: 'products.import-templates.[id].PUT', requireCsrf: false }
);
export const DELETE = apiHandlerWithParams<{ id: string }>(
  DELETE_handler,
  { source: 'products.import-templates.[id].DELETE', requireCsrf: false }
);
