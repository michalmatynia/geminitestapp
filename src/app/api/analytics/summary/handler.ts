import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAnalyticsSummary } from '@/shared/lib/analytics/server';
import { auth } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

const RANGE_VALUES = ['24h', '7d', '30d'] as const;
type AnalyticsRange = (typeof RANGE_VALUES)[number];

export const querySchema = z.object({
  range: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? '24h',
    z.enum(RANGE_VALUES)
  ),
  scope: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? 'all',
    z.enum(['all', 'public', 'admin'])
  ),
});

const getRangeWindow = (range: AnalyticsRange): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<AnalyticsRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const from = new Date(to.getTime() - msByRange[range]);
  return { from, to };
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const range = query.range;
  const scopeRaw = query.scope;
  const scope = scopeRaw === 'all' ? undefined : (scopeRaw);

  const { from, to } = getRangeWindow(range);
  const summary = await getAnalyticsSummary({
    from,
    to,
    ...(scope ? { scope } : {}),
  });

  return NextResponse.json(summary);
}
