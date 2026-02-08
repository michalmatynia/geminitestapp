export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportActiveTemplateId,
  setExportActiveTemplateId
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional()
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const templateId = await getExportActiveTemplateId();
  return NextResponse.json({ templateId });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'exports.base.active-template.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportActiveTemplateId(data.templateId ?? null);
  return NextResponse.json({ templateId: data.templateId ?? null });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.exports.base.active-template.GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.exports.base.active-template.POST', requireCsrf: false });
