import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requestSchema = z.object({
  enabled: z.boolean()
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const enabled = await getExportStockFallbackEnabled();
  return NextResponse.json({ enabled });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'exports.base.stock-fallback.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportStockFallbackEnabled(data.enabled);
  return NextResponse.json({ enabled: data.enabled });
}
