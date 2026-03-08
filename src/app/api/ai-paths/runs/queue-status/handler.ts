import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { canAccessGlobalAiPathRuns, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import { getAiPathRunQueueStatus } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const queueStatusCacheTtlMs = parseEnvNumber(
  process.env['AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS'],
  2000
);
const queueStatusCache = new Map<string, { expiresAt: number; payload: { status: unknown } }>();

export const __testOnly = {
  clearQueueStatusCache(): void {
    queueStatusCache.clear();
  },
};

export const querySchema = z.object({
  visibility: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'global' ? 'global' : 'scoped';
  }, z.enum(['scoped', 'global'])).default('scoped'),
  fresh: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }, z.boolean()).default(false),
});

const resolveQueueStatusQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const query = querySchema.parse(resolveQueueStatusQueryInput(req, _ctx));
  const visibility = query.visibility;
  const fresh = query.fresh;
  if (visibility === 'global' && !canAccessGlobalAiPathRuns(access)) {
    throw forbiddenError('Global queue status access denied.');
  }
  const cacheKey = visibility === 'global' ? 'global' : `scoped:${access.userId}`;
  const now = Date.now();
  const cached = queueStatusCache.get(cacheKey);
  if (!fresh && queueStatusCacheTtlMs > 0 && cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Ai-Poll-Guard': 'queue-status-cache-hit',
      },
    });
  }
  const status = await getAiPathRunQueueStatus({
    bypassCache: fresh,
    visibility,
    ...(visibility === 'scoped' ? { userId: access.userId } : {}),
  });
  const payload = { status };
  if (!fresh && queueStatusCacheTtlMs > 0) {
    queueStatusCache.set(cacheKey, {
      expiresAt: now + queueStatusCacheTtlMs,
      payload,
    });
  }
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Ai-Poll-Guard': 'queue-status-fresh',
    },
  });
}
