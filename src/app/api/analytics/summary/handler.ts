import { NextRequest, NextResponse } from 'next/server';

import { getAnalyticsSummary } from '@/features/analytics/server';
import { auth } from '@/features/auth/server';
import type { AnalyticsScope } from '@/shared/contracts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';

const RANGE_VALUES = ['24h', '7d', '30d'] as const;
type AnalyticsRange = (typeof RANGE_VALUES)[number];

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

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const searchParams = getQueryParams(req);

  const rangeRaw = searchParams.get('range') ?? '24h';
  if (!RANGE_VALUES.includes(rangeRaw as AnalyticsRange)) {
    throw badRequestError('Invalid range');
  }
  const range = rangeRaw as AnalyticsRange;

  const scopeRaw = searchParams.get('scope') ?? 'all';
  const scope =
    scopeRaw === 'all' ? undefined : (scopeRaw as AnalyticsScope);
  if (scopeRaw !== 'all' && scope !== 'public' && scope !== 'admin') {
    throw badRequestError('Invalid scope');
  }

  const { from, to } = getRangeWindow(range);
  const summary = await getAnalyticsSummary({
    from,
    to,
    ...(scope ? { scope } : {}),
  });

  return NextResponse.json(summary);
}
