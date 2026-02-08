import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createExportTemplate,
  listExportTemplates
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1)
});

const templateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).default([]),
  exportImagesAsBase64: z.boolean().optional()
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const templates = await listExportTemplates();
  return NextResponse.json(templates);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, templateSchema, {
    logPrefix: 'export-templates.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const template = await createExportTemplate({
    name: data.name,
    description: data.description ?? null,
    mappings: data.mappings,
    ...(data.exportImagesAsBase64 !== undefined && { exportImagesAsBase64: data.exportImagesAsBase64 })
  });
  return NextResponse.json(template);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.export-templates.GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.export-templates.POST', requireCsrf: false });
