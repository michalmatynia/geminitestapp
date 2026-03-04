import { ProductAiJobStatus as PrismaJobStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  getAiPathRunQueueStatus,
  startAiInsightsQueue,
  startAiPathRunQueue,
} from '@/features/jobs/server';
import {
  getProductAiJobProvider,
  getProductAiJobRepository,
} from '@/shared/lib/products/services/product-ai-job-repository';
import { notifyAiPathsSloBreach } from '@/shared/lib/observability/ai-paths-slo-notifier';
import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';
import type { ProductAiJobStatus } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const AI_PATH_STATUSES: AiPathRunStatus[] = [
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];

const JOB_STATUSES: ProductAiJobStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'canceled',
];
const DEFAULT_HEALTH_CRITICAL_GRACE_MS = 15 * 60 * 1000;
let criticalSloSinceMs: number | null = null;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toIso = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiPathRunQueue();
  startAiInsightsQueue();

  const errors: Record<string, string> = {};

  const aiPathsProvider = process.env['DATABASE_URL']
    ? 'prisma'
    : process.env['MONGODB_URI']
      ? 'mongodb'
      : 'unknown';

  const aiPaths = await (async () => {
    try {
      const repo = await getPathRunRepository();
      const byStatusEntries = await Promise.all(
        AI_PATH_STATUSES.map(async (status) => {
          const result = await repo.listRuns({ status, limit: 1, offset: 0 });
          return [status, result.total] as const;
        })
      );
      const byStatus = Object.fromEntries(byStatusEntries) as Record<AiPathRunStatus, number>;

      const all = await repo.listRuns({ limit: 1, offset: 0 });
      const latest = all.runs[0]
        ? {
          id: String((all.runs[0] as Record<string, unknown>)['id']),
          status: (all.runs[0] as Record<string, unknown>)['status'] as AiPathRunStatus,
          createdAt: toIso((all.runs[0] as Record<string, unknown>)['createdAt'] as string),
        }
        : null;
      return {
        provider: aiPathsProvider,
        total: all.total,
        byStatus,
        latest,
      };
    } catch (error) {
      errors['aiPaths'] =
        error instanceof Error ? error.message : 'Failed to load AI Paths counts.';
      return {
        provider: aiPathsProvider,
        total: null,
        byStatus: {} as Record<AiPathRunStatus, number>,
        latest: null,
      };
    }
  })();

  const aiJobs = await (async () => {
    try {
      await getProductAiJobRepository();
      const provider = getProductAiJobProvider() ?? 'unknown';

      if (provider === 'mongodb') {
        const db = await getMongoDb();
        const collection = db.collection('product_ai_jobs');
        const totals = await Promise.all(
          JOB_STATUSES.map(
            async (status) => [status, await collection.countDocuments({ status })] as const
          )
        );
        const total = await collection.countDocuments({});
        const latest = await collection
          .find(
            {},
            {
              projection: {
                _id: 1,
                id: 1,
                status: 1,
                createdAt: 1,
                productId: 1,
                type: 1,
              },
            }
          )
          .sort({ createdAt: -1 })
          .limit(1)
          .next();
        return {
          provider,
          total,
          byStatus: Object.fromEntries(totals) as Record<ProductAiJobStatus, number>,
          latest: latest
            ? {
              id:
                  (latest as unknown as { id?: string; _id?: string }).id ?? String(latest['_id']),
              status: latest['status'] as ProductAiJobStatus,
              createdAt: toIso(latest['createdAt'] as Date | string | null),
              productId: latest['productId'] as string | null,
              type: latest['type'] as string | null,
            }
            : null,
        };
      }

      if (provider === 'prisma') {
        const totals = await Promise.all(
          JOB_STATUSES.map(
            async (status) =>
              [
                status,
                await prisma.productAiJob.count({
                  where: { status: status as PrismaJobStatus },
                }),
              ] as const
          )
        );
        const total = await prisma.productAiJob.count();
        const latest = await prisma.productAiJob.findFirst({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            productId: true,
            type: true,
          },
        });
        return {
          provider,
          total,
          byStatus: Object.fromEntries(totals) as Record<ProductAiJobStatus, number>,
          latest: latest
            ? {
              id: latest.id,
              status: latest.status as ProductAiJobStatus,
              createdAt: toIso(latest.createdAt),
              productId: latest.productId ?? null,
              type: latest.type ?? null,
            }
            : null,
        };
      }

      return {
        provider,
        total: null,
        byStatus: {} as Record<ProductAiJobStatus, number>,
        latest: null,
      };
    } catch (error) {
      errors['aiJobs'] = error instanceof Error ? error.message : 'Failed to load AI Jobs counts.';
      return {
        provider: getProductAiJobProvider() ?? 'unknown',
        total: null,
        byStatus: {} as Record<ProductAiJobStatus, number>,
        latest: null,
      };
    }
  })();

  const queue = await (async () => {
    try {
      return await getAiPathRunQueueStatus();
    } catch (error) {
      errors['queue'] = error instanceof Error ? error.message : 'Failed to load queue health.';
      return null;
    }
  })();

  const runtime24h = await (async () => {
    try {
      const { from, to } = resolveRuntimeAnalyticsRangeWindow('24h');
      return await getRuntimeAnalyticsSummary({ from, to, range: '24h' });
    } catch (error) {
      errors['runtime24h'] =
        error instanceof Error ? error.message : 'Failed to load runtime analytics summary.';
      return null;
    }
  })();

  const sloNotification = await (async () => {
    if (!queue || queue.slo.overall === 'ok') return null;
    return notifyAiPathsSloBreach({
      status: queue.slo,
      queue: {
        running: queue.running,
        healthy: queue.healthy,
        activeRuns: queue.activeRuns,
        queuedCount: queue.queuedCount,
        queueLagMs: queue.queueLagMs,
      },
    });
  })();

  const nowMs = Date.now();
  const criticalGraceMs = parsePositiveInt(
    process.env['AI_PATHS_HEALTH_CRITICAL_GRACE_MS'],
    DEFAULT_HEALTH_CRITICAL_GRACE_MS
  );
  const isCriticalNow = queue?.slo?.overall === 'critical';
  if (isCriticalNow) {
    criticalSloSinceMs = criticalSloSinceMs ?? nowMs;
  } else {
    criticalSloSinceMs = null;
  }
  const criticalForMs = criticalSloSinceMs !== null ? Math.max(0, nowMs - criticalSloSinceMs) : 0;
  const hasCriticalSlo = isCriticalNow && criticalForMs >= criticalGraceMs;
  const ok = Object.keys(errors).length === 0 && !hasCriticalSlo;
  const responseErrors = ok
    ? undefined
    : Object.keys(errors).length > 0
      ? errors
      : {
        slo: `Critical AI Paths SLO breach detected for ${Math.round(criticalForMs / 1000)}s.`,
      };
  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      aiPaths,
      aiJobs,
      queue,
      runtime24h,
      sloGate: {
        graceMs: criticalGraceMs,
        criticalSince:
          criticalSloSinceMs !== null ? new Date(criticalSloSinceMs).toISOString() : null,
        criticalForMs,
      },
      sloNotification,
      errors: responseErrors,
    },
    { status: ok ? 200 : hasCriticalSlo ? 503 : 500 }
  );
}
