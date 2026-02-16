export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { getBaseImportRunDetailOrThrow } from '@/features/integrations/services/imports/base-import-service';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const detail = await getBaseImportRunDetailOrThrow(params.runId);
  return NextResponse.json(detail, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'integrations.imports.base.runs.[runId].GET',
  requireCsrf: false,
});
