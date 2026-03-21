import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { startProductSyncRun } from '@/features/product-sync/public/services/product-sync-run-starter';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Sync profile id is required'),
});

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const profileId = parsedParams.data.id;
  const run = await startProductSyncRun({
    profileId,
    trigger: 'manual',
  });
  return NextResponse.json(run, { headers: { 'Cache-Control': 'no-store' } });
}
