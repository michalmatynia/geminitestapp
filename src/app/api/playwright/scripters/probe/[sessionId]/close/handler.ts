import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getDefaultProbeService } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const postHandler = async (
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { sessionId: string }
): Promise<Response> => {
  if (!params.sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const closed = await getDefaultProbeService().close(params.sessionId);
  return NextResponse.json({ closed });
};
