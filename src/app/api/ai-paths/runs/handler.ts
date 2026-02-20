

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
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';

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
const runsListResponseCacheTtlMs = parseEnvNumber(
  process.env['AI_PATHS_RUNS_LIST_CACHE_TTL_MS'],
  2000
);
const runsListResponseCacheMaxEntries = parseEnvNumber(
  process.env['AI_PATHS_RUNS_LIST_CACHE_MAX_ENTRIES'],
  200
);
const runsListResponseCache = new Map<
  string,
  { expiresAt: number; payload: { runs: unknown[]; total: number } }
>();

const pruneRunsListResponseCache = (now: number): void => {
  for (const [key, entry] of runsListResponseCache.entries()) {
    if (entry.expiresAt <= now) {
      runsListResponseCache.delete(key);
    }
  }
  const overflow = runsListResponseCache.size - runsListResponseCacheMaxEntries;
  if (overflow <= 0) return;
  let removed = 0;
  for (const key of runsListResponseCache.keys()) {
    runsListResponseCache.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

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

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
  const cacheKey = JSON.stringify({
    userScope: hasGlobalRunAccess ? 'global' : access.userId,
    pathId: pathId ?? null,
    query: query ?? null,
    source: source ?? null,
    sourceMode,
    status: status ?? null,
    limit: limit ?? null,
    offset: offset ?? null,
  });
  const now = Date.now();
  if (runsListResponseCacheTtlMs > 0) {
    pruneRunsListResponseCache(now);
    const cached = runsListResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Ai-Poll-Guard': 'runs-cache-hit',
        },
      });
    }
  }
  const result = await repo.listRuns({
    ...(!hasGlobalRunAccess ? { userId: access.userId } : {}),
    ...(pathId ? { pathId } : {}),
    ...(query ? { query } : {}),
    ...(source ? { source, sourceMode } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  });
  if (runsListResponseCacheTtlMs > 0) {
    runsListResponseCache.set(cacheKey, {
      expiresAt: now + runsListResponseCacheTtlMs,
      payload: result as { runs: unknown[]; total: number },
    });
  }
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Ai-Poll-Guard': 'runs-fresh',
    },
  });
}

export async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
