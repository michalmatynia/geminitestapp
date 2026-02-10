import { NextRequest, NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/observability/services/error-system';
import type { ErrorContext } from '@/features/observability/services/error-system';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse> {
  // Use _ctx.body if available, otherwise parse json manually (though apiHandler can do it)
  // apiHandler options.parseJsonBody: true will populate _ctx.body
  
  const body = (await req.json()) as {
    error?: unknown;
    context?: ErrorContext;
    message?: string;
    name?: string;
    stack?: string | null;
  };
  
  const wrappedError = body.error;
  const directPayload =
    (body.message || body.name || body.stack)
      ? {
        message: body.message ?? 'Unknown client error',
        name: body.name ?? 'ClientError',
        stack: body.stack ?? undefined,
      }
      : null;
  const error = wrappedError ?? directPayload ?? body;
  const context = body.context ?? {};

  // Log the error using the server-only ErrorSystem
  await ErrorSystem.captureException(error, {
    ...context,
    source: 'client.error.reporter',
    service: 'client',
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

export const POST = apiHandler(POST_handler, {
  source: 'client-errors.POST',
  parseJsonBody: false, // We parse manually to handle custom structure if needed, or we can switch to true
});
