import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/features/auth/server';
import { getKangurObservabilitySummary } from '@/features/kangur/observability/summary';
import {
  kangurObservabilityRangeSchema,
  kangurObservabilitySummaryResponseSchema,
  type ApiHandlerContext,
} from '@/shared/contracts';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

type KangurObservabilitySession = {
  user?: {
    isElevated?: boolean;
    permissions?: string[];
  } | null;
} | null;

const canAccessKangurObservability = (session: KangurObservabilitySession): boolean =>
  Boolean(session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage'));

export const querySchema = z.object({
  range: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? '24h',
    kangurObservabilityRangeSchema
  ),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!canAccessKangurObservability(session)) {
    throw authError('Unauthorized.');
  }

  const parsedQuery = querySchema.safeParse(_ctx.query ?? {});
  if (!parsedQuery.success) {
    throw badRequestError('Invalid range');
  }
  const query = parsedQuery.data;

  const summary = await getKangurObservabilitySummary({ range: query.range });
  const responsePayload = { summary };
  const validatedResponse = kangurObservabilitySummaryResponseSchema.safeParse(responsePayload);
  if (!validatedResponse.success) {
    throw internalError('Invalid Kangur observability summary contract', {
      issues: validatedResponse.error.flatten(),
    });
  }

  return NextResponse.json(
    validatedResponse.data,
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
