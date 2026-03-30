import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKangurObservabilitySummary } from '@/features/kangur/observability/summary';
import {
  kangurObservabilityRangeSchema,
  kangurObservabilitySummaryResponseSchema,
  type ApiHandlerContext,
} from '@/shared/contracts';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  range: z.preprocess(
    (value) => normalizeOptionalQueryString(value) ?? '24h',
    kangurObservabilityRangeSchema
  ),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();

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
