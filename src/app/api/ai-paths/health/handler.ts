import { type NextRequest, NextResponse } from 'next/server';

import { startAiPathRunQueue } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { getAiPathRunQueueStatus } from '@/features/ai/ai-paths/workers/ai-path-run-queue/status';
import { startAiInsightsQueue } from '@/features/ai/insights/workers/aiInsightsQueue';
import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/server';
import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';
import type { ProductAiJobStatus } from '@/shared/contracts/jobs';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { notifyAiPathsSloBreach } from '@/shared/lib/observability/ai-paths-slo-notifier';
import {
  getProductAiJobProvider,
  getProductAiJobRepository,
} from '@/shared/lib/products/services/product-ai-job-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const AI_PATH_STATUSES: AiPathRunStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveRecordId = (record: Record<string, unknown>): string | null => {
  const directId = toOptionalString(record['id']);
  if (directId !== null) return directId;
  const fallback = record['_id'];
  return fallback === undefined || fallback === null ? null : String(fallback);
};

const toIso = (value?: Date | string | null): string | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};




interface HealthStatus {
  slo: { overall: 'ok' | 'critical' };
  running: number;
  healthy: number;
  activeRuns: number;
  queuedCount: number;
  queueLagMs: number;
}

interface RuntimeSummary {
  [key: string]: unknown;
}

async function getAiPathsHealth(): Promise<{ provider: string; routeMode: string; collection: string; total: number | null; byStatus: Record<AiPathRunStatus, number>; latest: { id: string; status: AiPathRunStatus; createdAt: string | null } | null; error?: string }> {
  try {
    const repoSelection = await resolvePathRunRepository();
    const repo = repoSelection.repo;
    const byStatusEntries = await Promise.all(
      AI_PATH_STATUSES.map(async (status) => {
        const result = await repo.listRuns({ status, limit: 1, offset: 0 });
        return [status, result.total] as const;
      })
    );
    const byStatus: Record<AiPathRunStatus, number> = Object.fromEntries(byStatusEntries);
    const all = await repo.listRuns({ limit: 1, offset: 0 });
    const latestRun = all.runs[0];
    const latest = latestRun
      ? {
        id: String((latestRun as Record<string, unknown>)['id']),
        status: (latestRun as Record<string, unknown>)['status'] as AiPathRunStatus,
        createdAt: toIso((latestRun as Record<string, unknown>)['createdAt'] as string),
      }
      : null;
    return {
      provider: repoSelection.provider,
      routeMode: repoSelection.routeMode,
      collection: repoSelection.collection,
      total: all.total,
      byStatus,
      latest,
    };
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => { /* ignore */ });
    return {
      provider: 'unknown',
      routeMode: 'fallback',
      collection: 'ai_path_runs',
      total: null,
      byStatus: {},
      latest: null,
      error: error instanceof Error ? error.message : 'Failed to load AI Paths counts.',
    };
  }
}

async function getAiJobsHealth(): Promise<{ provider: string; total: number | null; byStatus: Record<ProductAiJobStatus, number>; latest: { id: string; status: ProductAiJobStatus; createdAt: string | null; productId: string | null; type: string | null } | null; error?: string }> {
  try {
    await getProductAiJobRepository();
    const provider = getProductAiJobProvider() ?? 'unknown';

    if (provider !== 'mongodb') {
      return { provider, total: null, byStatus: {}, latest: null };
    }

    const db = await getMongoDb();
    const collection = db.collection('product_ai_jobs');
    const totals = await Promise.all(
      JOB_STATUSES.map(async (status) => [status, await collection.countDocuments({ status })] as const)
    );
    const total = await collection.countDocuments({});
    const latest = await collection
      .find({}, { projection: { _id: 1, id: 1, status: 1, createdAt: 1, productId: 1, type: 1 } })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    
    const byStatus: Record<ProductAiJobStatus, number> = Object.fromEntries(totals);
    const latestRecord = asRecord(latest);
    const latestId = latestRecord ? resolveRecordId(latestRecord) : null;
    
    let latestInfo = null;
    if (latestRecord !== null && latestId !== null) {
      latestInfo = {
        id: latestId,
        status: latestRecord['status'] as ProductAiJobStatus,
        createdAt: toIso(latestRecord['createdAt'] as Date | string | null),
        productId: toOptionalString(latestRecord['productId']),
        type: toOptionalString(latestRecord['type']),
      };
    }
    
    return { provider, total, byStatus, latest: latestInfo };
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => { /* ignore */ });
    return {
      provider: getProductAiJobProvider() ?? 'unknown',
      total: null,
      byStatus: {},
      latest: null,
      error: error instanceof Error ? error.message : 'Failed to load AI Jobs counts.',
    };
  }
}

async function getQueueStatus(): Promise<{ status: HealthStatus | null; error?: string }> {
  try {
    const status = await getAiPathRunQueueStatus();
    return { status: status as HealthStatus | null };
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => { /* ignore */ });
    return { status: null, error: error instanceof Error ? error.message : 'Failed to load queue health.' };
  }
}

async function getRuntimeHealth(): Promise<{ summary: RuntimeSummary | null; error?: string }> {
  try {
    const { from, to } = resolveRuntimeAnalyticsRangeWindow('24h');
    const summary = await getRuntimeAnalyticsSummary({ from, to, range: '24h' });
    return { summary: summary as RuntimeSummary };
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => { /* ignore */ });
    return { summary: null, error: error instanceof Error ? error.message : 'Failed to load runtime analytics summary.' };
  }
}

let globalCriticalSloSinceMs: number | null = null;

export async function getHealthHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiPathRunQueue();
  startAiInsightsQueue();

  const errors: Record<string, string> = {};
  const [aiPaths, aiJobs, queueResult, runtimeResult] = await Promise.all([
    getAiPathsHealth(),
    getAiJobsHealth(),
    getQueueStatus(),
    getRuntimeHealth(),
  ]);

  if (aiPaths.error) errors['aiPaths'] = aiPaths.error;
  if (aiJobs.error) errors['aiJobs'] = aiJobs.error;
  if (queueResult.error) errors['queue'] = queueResult.error;
  if (runtimeResult.error) errors['runtime24h'] = runtimeResult.error;

  const queue = queueResult.status;
  let sloNotification = null;
  if (queue !== null && queue.slo.overall !== 'ok') {
    sloNotification = await notifyAiPathsSloBreach({
        status: queue.slo,
        queue: { running: queue.running, healthy: queue.healthy, activeRuns: queue.activeRuns, queuedCount: queue.queuedCount, queueLagMs: queue.queueLagMs },
    });
  }

  const nowMs = Date.now();
  const criticalGraceMs = parsePositiveInt(process.env['AI_PATHS_HEALTH_CRITICAL_GRACE_MS'], DEFAULT_HEALTH_CRITICAL_GRACE_MS);
  const isCriticalNow = queue !== null && queue.slo.overall === 'critical';
  
  globalCriticalSloSinceMs = isCriticalNow ? (globalCriticalSloSinceMs ?? nowMs) : null;
  const criticalForMs = globalCriticalSloSinceMs !== null ? Math.max(0, nowMs - globalCriticalSloSinceMs) : 0;
  const hasCriticalSlo = isCriticalNow && criticalForMs >= criticalGraceMs;
  const ok = Object.keys(errors).length === 0 && !hasCriticalSlo;

  let responseErrors: Record<string, string> | undefined = undefined;
  if (Object.keys(errors).length > 0) {
    responseErrors = errors;
  } else if (hasCriticalSlo) {
    responseErrors = { slo: `Critical AI Paths SLO breach detected for ${Math.round(criticalForMs / 1000)}s.` };
  }

  let status = 200;
  if (!ok) {
    status = hasCriticalSlo ? 503 : 500;
  }

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      aiPaths,
      aiJobs,
      queue,
      runtime24h: runtimeResult.summary,
      sloGate: { graceMs: criticalGraceMs, criticalSince: globalCriticalSloSinceMs !== null ? new Date(globalCriticalSloSinceMs).toISOString() : null, criticalForMs },
      sloNotification,
      errors: responseErrors,
    },
    { status }
  );
}



