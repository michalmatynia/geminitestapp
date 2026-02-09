import { NextRequest, NextResponse } from 'next/server';

import { logSystemEvent } from '@/features/observability/server';
import { ErrorSystem } from '@/features/observability/services/error-system';
import type { ErrorContext } from '@/features/observability/services/error-system';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { error: unknown; context: ErrorContext };
    const { error, context } = body;

    // Log the error using the server-only ErrorSystem
    await ErrorSystem.captureException(error, {
      ...context,
      source: 'client.error.reporter',
      service: 'client',
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    await logSystemEvent({
      level: 'error',
      message: 'Failed to log client error',
      error: err,
      context: {
        source: 'api/client-errors',
      },
    });
    return NextResponse.json({ success: false, error: 'Failed to process error report' }, { status: 500 });
  }
}