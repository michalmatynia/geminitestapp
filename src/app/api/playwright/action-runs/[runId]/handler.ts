import { type NextRequest, NextResponse } from 'next/server';

import { getPlaywrightActionRunDetail } from '@/shared/lib/playwright/action-run-history-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw validationError('Invalid route parameters', { runId: params.runId });
  }

  const response = await getPlaywrightActionRunDetail(runId);
  if (!response) {
    throw notFoundError('Playwright action run not found.', { runId });
  }

  return NextResponse.json(response);
}
