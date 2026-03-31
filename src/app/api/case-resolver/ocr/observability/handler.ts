import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCaseResolverOcrObservabilitySnapshot } from '@/features/case-resolver/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(400)),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const limit = query.limit;

  const options: { limit?: number } = {};
  if (typeof limit === 'number') {
    options.limit = limit;
  }

  const snapshot = await getCaseResolverOcrObservabilitySnapshot(options);
  return NextResponse.json({
    snapshot,
  });
}
