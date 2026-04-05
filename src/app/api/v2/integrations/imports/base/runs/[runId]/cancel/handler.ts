import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { cancelBaseImportRun, toStartResponse } from '@/features/integrations/server';
import type { BaseImportStartResponse } from '@/shared/contracts/integrations/base-com';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId } = parsedParams.data;
  const run = await cancelBaseImportRun(runId);
  const response: BaseImportStartResponse = toStartResponse(run);
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
