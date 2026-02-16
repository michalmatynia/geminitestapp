export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import {
  canAccessGlobalAiPathRuns,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import {
  recoverStaleRunningRuns,
  resolveAiPathsStaleRunningCleanupIntervalMs,
  resolveAiPathsStaleRunningMaxAgeMs,
} from '@/features/ai/ai-paths/services/path-run-recovery-service';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import type { AiPathRunListOptions } from '@/features/ai/ai-paths/types/path-run-repository';
import { removePathRunQueueEntries } from '@/features/jobs/workers/aiPathRunQueue';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { AiPathRunStatus } from '@/shared/types/domain/ai-paths';

let lastStaleRunningCleanupAt = 0;
let staleRunningCleanupPromise: Promise<void> | null = null;

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const staleRunningCleanupIntervalMs = parseEnvNumber(
  process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'],
  resolveAiPathsStaleRunningCleanupIntervalMs()
);
const staleRunningMaxAgeMs = resolveAiPathsStaleRunningMaxAgeMs();

const scheduleStaleRunningCleanup = (
  repo: Awaited<ReturnType<typeof getPathRunRepository>>
): void => {
  const now = Date.now();
  if (staleRunningCleanupPromise) return;
  if (now - lastStaleRunningCleanupAt < staleRunningCleanupIntervalMs) return;
  lastStaleRunningCleanupAt = now;

  const runCleanup = async (): Promise<void> => {
    try {
      await recoverStaleRunningRuns({
        repo,
        source: 'ai-paths.runs.list',
        maxAgeMs: staleRunningMaxAgeMs,
      });
    } finally {
      staleRunningCleanupPromise = null;
    }
  };

  staleRunningCleanupPromise = runCleanup();
};

const RUN_STATUSES: AiPathRunStatus[] = [
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];

const TERMINAL_STATUSES: AiPathRunStatus[] = [
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const url = new URL(req.url);
  const pathId = url.searchParams.get('pathId')?.trim() || undefined;
  const query = url.searchParams.get('query')?.trim() || undefined;
  const source = url.searchParams.get('source')?.trim() || undefined;
  const sourceModeParam = url.searchParams.get('sourceMode')?.trim() || '';
  const sourceMode = sourceModeParam === 'exclude' ? 'exclude' : 'include';
  const statusParam = url.searchParams.get('status')?.trim() || '';
  const status = RUN_STATUSES.includes(statusParam as AiPathRunStatus)
    ? (statusParam as AiPathRunStatus)
    : undefined;
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  const limitRaw = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  const offsetRaw = offsetParam ? Number.parseInt(offsetParam, 10) : NaN;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : undefined;
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : undefined;
  const repo = await getPathRunRepository();
  scheduleStaleRunningCleanup(repo);
  const hasGlobalRunAccess = canAccessGlobalAiPathRuns(access);
  const result = await repo.listRuns({
    ...(!hasGlobalRunAccess ? { userId: access.userId } : {}),
    ...(pathId ? { pathId } : {}),
    ...(query ? { query } : {}),
    ...(source ? { source, sourceMode } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  });
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'runs-clear');
  const url = new URL(req.url);
  const scopeRaw = url.searchParams.get('scope')?.trim().toLowerCase() || 'terminal';
  const scope = scopeRaw === 'all' ? 'all' : 'terminal';
  const pathId = url.searchParams.get('pathId')?.trim() || undefined;
  const source = url.searchParams.get('source')?.trim() || undefined;
  const sourceModeParam = url.searchParams.get('sourceMode')?.trim() || '';
  const sourceMode = sourceModeParam === 'exclude' ? 'exclude' : 'include';

  const repo = await getPathRunRepository();
  const hasGlobalRunAccess = canAccessGlobalAiPathRuns(access);
  const listOptions: AiPathRunListOptions = {};
  if (!hasGlobalRunAccess) {
    listOptions.userId = access.userId;
  }
  if (pathId) {
    listOptions.pathId = pathId;
  }
  if (source) {
    listOptions.source = source;
    listOptions.sourceMode = sourceMode;
  }
  if (scope === 'terminal') {
    listOptions.statuses = TERMINAL_STATUSES;
  }
  const { runs } = await repo.listRuns(listOptions);
  const runIds = runs.map((run) => run.id).filter((runId): runId is string => Boolean(runId));
  if (runIds.length > 0) {
    await removePathRunQueueEntries(runIds);
  }
  const result = await repo.deleteRuns({
    ...listOptions,
  });

  return NextResponse.json({ deleted: result.count, scope });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'ai-paths.runs.list' });

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: 'ai-paths.runs.clear' });
