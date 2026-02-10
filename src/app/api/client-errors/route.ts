import { NextRequest, NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/observability/server';
import type { ErrorContext } from '@/features/observability/services/error-system';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse> {
  const body = (await req.json()) as {
    error?: unknown;
    context?: ErrorContext;
    message?: string;
    name?: string;
    stack?: string | null;
    url?: string;
  };

  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message
      : 'Unknown client error';
  const normalizedError = new Error(message);
  normalizedError.name =
    typeof body.name === 'string' && body.name.trim().length > 0
      ? body.name
      : 'ClientError';
  if (typeof body.stack === 'string' && body.stack.trim().length > 0) {
    normalizedError.stack = body.stack;
  }

  await ErrorSystem.captureException(normalizedError, {
    ...(body.context ?? {}),
    source: 'client.error.reporter',
    service: 'client-error-reporter',
    ...(typeof body.url === 'string' ? { url: body.url } : {}),
    extra: body.context ?? {},
  });

  return NextResponse.json({ ok: true, success: true }, { status: 200 });
}

export const POST = apiHandler(POST_handler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  // Browser-side error reporter can fire before CSRF cookie/header bootstrap.
  requireCsrf: false,
});
