import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getProductAiJobs,
  deleteTerminalProductAiJobs,
  deleteAllProductAiJobs,
  cleanupStaleRunningProductAiJobs,
} from '@/features/jobs/server';
import { startProductAiJobQueue, getQueueStatus } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isLegacySchemaMismatchError = (
  error: unknown
): error is { code: 'P2021' | 'P2022' } => {
  if (!error || typeof error !== 'object') return false;
  const { code } = error as { code?: unknown };
  return code === 'P2021' || code === 'P2022';
};

export const listQuerySchema = z.object({
  status: optionalBooleanQuerySchema().default(false),
  productId: optionalTrimmedQueryString(),
});

export const deleteQuerySchema = z.object({
  scope: z.enum(['terminal', 'all']),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const staleCount = await cleanupStaleRunningProductAiJobs(1000 * 60 * 10);
    if (staleCount > 0) {
      await logSystemEvent({
        level: 'info',
        message: `[api/products/ai-jobs] Marked ${staleCount} stale running jobs as failed`,
        context: { staleCount },
      });
    }
    const query = (_ctx.query ?? {}) as z.infer<typeof listQuerySchema>;

    // Check if requesting queue status
    if (query.status) {
      const status = await getQueueStatus();
      await logSystemEvent({
        level: 'info',
        message: '[api/products/ai-jobs] Queue status',
        context: { status },
      });
      return NextResponse.json(
        { status },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const jobs = await getProductAiJobs(query.productId ?? undefined);
    const queueStatus = await getQueueStatus();
    if (!queueStatus.running) {
      const hasActiveJobs = jobs.some(
        (job) => job['status'] === 'pending' || job['status'] === 'running'
      );
      const hasScheduledJobs = jobs.some((job) => hasScheduledMarker(job['payload']));
      if (hasActiveJobs || hasScheduledJobs) {
        startProductAiJobQueue();
      }
    }
    return NextResponse.json(
      { jobs },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    if (isLegacySchemaMismatchError(error)) {
      await logSystemEvent({
        level: 'warn',
        message: '[api/products/ai-jobs] Legacy schema mismatch; returning empty job list.',
        context: { code: error.code },
      });
      return NextResponse.json({ jobs: [] });
    }
    throw error;
  }
}

const hasScheduledMarker = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  const keys = ['runAt', 'scheduledAt', 'scheduleAt', 'nextRunAt', 'schedule', 'scheduled', 'cron'];
  if (keys.some((key) => record[key])) return true;
  const context = record['context'];
  if (context && typeof context === 'object') {
    const ctx = context as Record<string, unknown>;
    if (keys.some((key) => ctx[key])) return true;
  }
  return false;
};

export async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const scope = query.scope;

  if (scope === 'terminal') {
    const count = await deleteTerminalProductAiJobs();
    return NextResponse.json({ success: true, count });
  }
  if (scope === 'all') {
    const count = await deleteAllProductAiJobs();
    return NextResponse.json({ success: true, count });
  }

  throw badRequestError('Invalid scope');
}
