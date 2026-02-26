import { NextRequest, NextResponse } from 'next/server';

import { getCaseResolverOcrObservabilitySnapshot } from '@/features/case-resolver/server/ocr-observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const parseLimit = (value: string | null): number | undefined => {
  if (value === null || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw badRequestError('limit must be a positive number.');
  }
  return Math.min(400, Math.floor(parsed));
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const options: { limit?: number } = {};
  if (typeof limit === 'number') {
    options.limit = limit;
  }

  const snapshot = await getCaseResolverOcrObservabilitySnapshot(options);
  return NextResponse.json({
    snapshot,
  });
}
