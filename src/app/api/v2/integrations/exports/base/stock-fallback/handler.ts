import { type NextRequest, NextResponse } from 'next/server';

import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { BaseStockFallbackPreferenceResponse } from '@/shared/contracts/integrations/preferences';
import { baseStockFallbackPreferencePayloadSchema } from '@/shared/contracts/integrations/preferences';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const enabled = await getExportStockFallbackEnabled();
  const response: BaseStockFallbackPreferenceResponse = { enabled };
  return NextResponse.json(response);
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseStockFallbackPreferencePayloadSchema, {
    logPrefix: 'exports.base.stock-fallback.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  if (typeof data.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }
  const enabled = data.enabled;
  await setExportStockFallbackEnabled(enabled);
  const response: BaseStockFallbackPreferenceResponse = { enabled };
  return NextResponse.json(response);
}
