import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { getAiPathRunQueueStatus } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const parseEnvNumber = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const queueStatusCacheTtlMs = parseEnvNumber(
  process.env['AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS'],
  2000,
);
let queueStatusCacheEntry: {
  expiresAt: number;
  payload: { status: unknown };
} | null = null;

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  await requireAiPathsAccess();
  const now = Date.now();
  if (
    queueStatusCacheTtlMs > 0 &&
    queueStatusCacheEntry &&
    queueStatusCacheEntry.expiresAt > now
  ) {
    return NextResponse.json(queueStatusCacheEntry.payload, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Ai-Poll-Guard': 'queue-status-cache-hit',
      },
    });
  }
  const status = await getAiPathRunQueueStatus();
  const payload = { status };
  if (queueStatusCacheTtlMs > 0) {
    queueStatusCacheEntry = {
      expiresAt: now + queueStatusCacheTtlMs,
      payload,
    };
  }
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Ai-Poll-Guard': 'queue-status-fresh',
    },
  });
}
