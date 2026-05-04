import { type NextRequest, NextResponse } from 'next/server';

import { getAiPathRunQueueStatus } from '@/features/ai/ai-paths/workers/ai-path-run-queue/status';
import { canAccessGlobalAiPathRuns, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  aiPathRunQueueStatusQuerySchema,
  type AiPathRunQueueStatusQuery,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

type CacheEntry = {
  readonly expiresAt: number;
  readonly payload: {
    readonly status: unknown;
  };
};

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const queueStatusCacheTtlMs = parseEnvNumber(
  process.env['AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS'],
  2_000
);
const queueStatusCache = new Map<string, CacheEntry>();

export const TEST_ONLY = {
  clearQueueStatusCache(): void {
    queueStatusCache.clear();
  },
};
export { TEST_ONLY as __testOnly };

export const querySchema = aiPathRunQueueStatusQuerySchema;

const resolveQueueStatusQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

type CacheContext = {
  userId: string;
  visibility: 'global' | 'scoped';
};

const buildCacheKey = (context: CacheContext): string => {
  return context.visibility === 'global' ? 'global' : `scoped:${context.userId}`;
};

const getCachedQueueStatus = (
  cacheKey: string,
  now: number
): CacheEntry['payload'] | null => {
  const cached = queueStatusCache.get(cacheKey);
  if (cached === undefined || cached.expiresAt <= now) {
    return null;
  }
  return cached.payload;
};

const createCacheableQueueStatusPayload = async (
  query: AiPathRunQueueStatusQuery,
  access: CacheContext
): Promise<CacheEntry['payload']> => {
  const status = await getAiPathRunQueueStatus({
    bypassCache: query.fresh,
    visibility: query.visibility,
    ...(query.visibility === 'scoped' ? { userId: access.userId } : {}),
  });
  return { status };
};

const writeQueueStatusCache = (
  cacheKey: string,
  now: number,
  payload: CacheEntry['payload']
): void => {
  queueStatusCache.set(cacheKey, {
    expiresAt: now + queueStatusCacheTtlMs,
    payload,
  });
};

const buildQueueStatusHeaders = (pollGuard: string): Record<string, string> => ({
  'Cache-Control': 'no-store',
  'X-Ai-Poll-Guard': pollGuard,
});

export const getHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const access = await requireAiPathsRunAccess();
  const query = querySchema.parse(resolveQueueStatusQueryInput(req, _ctx));
  if (query.visibility === 'global' && !canAccessGlobalAiPathRuns(access)) {
    throw forbiddenError('Global queue status access denied.');
  }

  const cacheKey = buildCacheKey({ userId: access.userId, visibility: query.visibility });
  const now = Date.now();
  const cachedPayload = !query.fresh && queueStatusCacheTtlMs > 0 ? getCachedQueueStatus(cacheKey, now) : null;
  if (cachedPayload !== null) {
    return NextResponse.json(cachedPayload, {
      headers: buildQueueStatusHeaders('queue-status-cache-hit'),
    });
  }

  const payload = await createCacheableQueueStatusPayload(query, {
    userId: access.userId,
    visibility: query.visibility,
  });
  if (!query.fresh && queueStatusCacheTtlMs > 0) {
    writeQueueStatusCache(cacheKey, now, payload);
  }

  return NextResponse.json(payload, {
    headers: buildQueueStatusHeaders('queue-status-fresh'),
  });
};
