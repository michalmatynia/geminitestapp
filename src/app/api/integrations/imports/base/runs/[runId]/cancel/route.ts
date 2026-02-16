export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import {
  cancelBaseImportRun,
  toStartResponse,
} from '@/features/integrations/services/imports/base-import-service';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const run = await cancelBaseImportRun(params.runId);
  return NextResponse.json(toStartResponse(run), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: 'integrations.imports.base.runs.[runId].cancel.POST',
  requireCsrf: false,
});
