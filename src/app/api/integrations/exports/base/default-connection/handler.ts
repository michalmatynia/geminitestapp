import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportDefaultConnectionId,
  setExportDefaultConnectionId
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const postSchema = z.object({
  connectionId: z.string().nullable()
});

/**
 * GET /api/integrations/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const connectionId = await getExportDefaultConnectionId();
  return NextResponse.json({ connectionId });
}

/**
 * POST /api/integrations/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
