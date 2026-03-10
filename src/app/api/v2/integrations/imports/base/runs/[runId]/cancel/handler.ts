import { NextRequest, NextResponse } from 'next/server';

import { cancelBaseImportRun, toStartResponse } from '@/features/integrations/server';
import type { BaseImportStartResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const run = await cancelBaseImportRun(params.runId);
  const response: BaseImportStartResponse = toStartResponse(run);
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
