import { NextRequest, NextResponse } from 'next/server';

import { initializeQueues } from '@/features/jobs/server';
import type { QueueHealthStatus, TraderaQueueHealthResponse } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getQueueHealth, isRedisAvailable } from '@/shared/lib/queue';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  initializeQueues();
  await Promise.all([
    import('@/features/integrations/server'),
    import('@/features/integrations/server'),
  ]);

  const redisAvailable = isRedisAvailable();
  const mode: TraderaQueueHealthResponse['mode'] = redisAvailable ? 'bullmq' : 'inline';
  const healthMap =
    (await getQueueHealth().catch(() => ({}) as Record<string, QueueHealthStatus>)) ?? {};

  const listings = healthMap['tradera-listings'] ?? null;
  const relistScheduler = healthMap['tradera-relist-scheduler'] ?? null;

  const payload: TraderaQueueHealthResponse = {
    ok: mode === 'inline' ? true : Boolean(listings?.running),
    mode,
    redisAvailable,
    timestamp: new Date().toISOString(),
    queues: {
      listings,
      relistScheduler,
    },
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
