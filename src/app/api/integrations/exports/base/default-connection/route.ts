export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportDefaultConnectionId,
  setExportDefaultConnectionId
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const postSchema = z.object({
  connectionId: z.string().nullable()
});

/**
 * GET /api/integrations/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const connectionId = await getExportDefaultConnectionId();
  return NextResponse.json({ connectionId });
}

/**
 * POST /api/integrations/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, postSchema, {
    logPrefix: 'exports.base.default-connection.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportDefaultConnectionId(data.connectionId);
  return NextResponse.json({ success: true });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.exports.base.default-connection.GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.exports.base.default-connection.POST', requireCsrf: false });
