import { NextRequest, NextResponse } from 'next/server';

import {
  cancelBaseImportRun,
  toStartResponse,
} from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(
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
