import { type NextRequest, NextResponse } from 'next/server';

import { initializeQueues } from '@/features/jobs/server';
import type { BaseImportQueueHealthResponse, QueueHealthStatus } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getQueueHealth, isRedisAvailable } from '@/shared/lib/queue';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  initializeQueues();
  await import('@/features/integrations/server');

  const redisAvailable = isRedisAvailable();
  const mode: BaseImportQueueHealthResponse['mode'] = redisAvailable ? 'bullmq' : 'inline';
  const healthMap =
    (await getQueueHealth().catch(() => ({}) as Record<string, QueueHealthStatus>)) ?? {};

  const baseImport = healthMap['base-import'] ?? null;

  const payload: BaseImportQueueHealthResponse = {
    ok: mode === 'inline' ? true : Boolean(baseImport?.running),
    mode,
    redisAvailable,
    timestamp: new Date().toISOString(),
    queues: {
      baseImport,
    },
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
