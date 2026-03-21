import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import {
  analyticsEventFilterScopeSchema,
  analyticsRangeSchema,
} from '@/shared/contracts/analytics';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { resolveAnalyticsRangeWindow } from '@/shared/lib/analytics/range';
import { getAnalyticsSummary } from '@/shared/lib/analytics/server';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  range: z.preprocess((value) => normalizeOptionalQueryString(value) ?? '24h', analyticsRangeSchema),
  scope: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? 'all',
    analyticsEventFilterScopeSchema
  ),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const query = querySchema.parse(_ctx.query ?? {});
  const range = query.range;
  const scopeRaw = query.scope;
  const scope = scopeRaw === 'all' ? undefined : (scopeRaw);

  const { from, to } = resolveAnalyticsRangeWindow(range);
  const summary = await getAnalyticsSummary({
    from,
    to,
    ...(scope ? { scope } : {}),
  });

  return NextResponse.json(summary);
}
