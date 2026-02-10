export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getDatabaseEngineStatus } from '@/features/database/services/database-engine-status';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const payload = await getDatabaseEngineStatus();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const GET = apiHandler(GET_handler, {
  source: 'databases.engine.status.GET',
});
