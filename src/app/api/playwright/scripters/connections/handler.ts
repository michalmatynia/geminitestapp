import { NextResponse } from 'next/server';

import { listProgrammableConnectionCandidates } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const getHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  try {
    const connections = await listProgrammableConnectionCandidates();
    return NextResponse.json({ connections });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
};
