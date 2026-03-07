import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurObservabilitySummary } from '@/features/kangur/observability/summary';
import {
  kangurObservabilityRangeSchema,
  kangurObservabilitySummaryResponseSchema,
  type ApiHandlerContext,
} from '@/shared/contracts';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';

type KangurObservabilitySession = {
  user?: {
    isElevated?: boolean;
    permissions?: string[];
  } | null;
} | null;

const canAccessKangurObservability = (session: KangurObservabilitySession): boolean =>
  Boolean(session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage'));

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!canAccessKangurObservability(session)) {
    throw authError('Unauthorized.');
  }

  const url = new URL(req.url);
  const rangeRaw = url.searchParams.get('range') ?? '24h';
  const parsedRange = kangurObservabilityRangeSchema.safeParse(rangeRaw);
  if (!parsedRange.success) {
    throw badRequestError('Invalid range');
  }

  const summary = await getKangurObservabilitySummary({ range: parsedRange.data });
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
