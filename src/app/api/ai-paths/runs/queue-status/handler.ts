import { NextRequest, NextResponse } from 'next/server';

import { canAccessGlobalAiPathRuns, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import { getAiPathRunQueueStatus } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

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

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const url = new URL(req.url);
  const visibilityParam = url.searchParams.get('visibility')?.trim().toLowerCase() || 'scoped';
  const visibility = visibilityParam === 'global' ? 'global' : 'scoped';
  const freshParam = url.searchParams.get('fresh')?.trim().toLowerCase();
  const fresh = freshParam === '1' || freshParam === 'true' || freshParam === 'yes';
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
