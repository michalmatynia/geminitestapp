import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { getSettingsCacheStats, isSettingsCacheDebugEnabled } from '@/shared/lib/settings-cache';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (!isSettingsCacheDebugEnabled()) {
    throw notFoundError('Not found');
  }
  return NextResponse.json(getSettingsCacheStats(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
