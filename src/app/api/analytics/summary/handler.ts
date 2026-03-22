import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { analyticsSummaryQuerySchema } from '@/shared/contracts/analytics';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { resolveAnalyticsRangeWindow } from '@/shared/lib/analytics/range';
import { getAnalyticsSummary } from '@/shared/lib/analytics/server';

export { analyticsSummaryQuerySchema as querySchema };

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const query = analyticsSummaryQuerySchema.parse(_ctx.query ?? {});
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
