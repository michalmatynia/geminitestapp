import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { deletePathRunsWithRepository } from '@/features/ai/ai-paths/server';
import type { AiPathRunListOptions, AiPathRunStatus } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

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
  3_000 // 3 s default — avoids repeated MongoDB scans on frequent UI polls
);
const runsListResponseCacheMaxEntries = parseEnvNumber(
  process.env['AI_PATHS_RUNS_LIST_CACHE_MAX_ENTRIES'],
  200
);
const runsListResponseCache = new Map<
  string,
  { expiresAt: number; payload: { runs: unknown[]; total: number } }
>();

export const __testOnly = {
  clearRunsListResponseCache(): void {
    runsListResponseCache.clear();
  },
};

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

const TERMINAL_STATUSES: AiPathRunStatus[] = ['completed', 'failed', 'canceled', 'dead_lettered'];

const listStatusSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized && RUN_STATUSES.includes(normalized as AiPathRunStatus) ? normalized : undefined;
}, z.enum(['queued', 'running', 'paused', 'completed', 'failed', 'canceled', 'dead_lettered']).optional());

export const listQuerySchema = z.object({
  visibility: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'global' ? 'global' : 'scoped';
  }, z.enum(['scoped', 'global'])).default('scoped'),
  pathId: optionalTrimmedQueryString(),
  nodeId: optionalTrimmedQueryString(),
  requestId: optionalTrimmedQueryString(),
  query: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'exclude' ? 'exclude' : 'include';
  }, z.enum(['include', 'exclude'])).default('include'),
  status: listStatusSchema,
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(500)),
  offset: optionalIntegerQuerySchema(z.number().int().min(0)),
  includeTotal: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return !(normalized === '0' || normalized === 'false' || normalized === 'no');
  }, z.boolean()).default(true),
  fresh: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }, z.boolean()).default(false),
});

export const deleteQuerySchema = z.object({
  scope: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'all' ? 'all' : 'terminal';
  }, z.enum(['terminal', 'all'])).default('terminal'),
  pathId: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'exclude' ? 'exclude' : 'include';
  }, z.enum(['include', 'exclude'])).default('include'),
});

const resolveAiPathRunsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const query = listQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const visibility = query.visibility;
  const pathId = query.pathId ?? undefined;
  const nodeId = query.nodeId ?? undefined;
  const requestId = query.requestId ?? undefined;
  const searchQuery = query.query ?? undefined;
  const source = query.source ?? undefined;
  const sourceMode = query.sourceMode;
  const status = query.status ?? undefined;
  const limit = query.limit ?? undefined;
  const offset = query.offset ?? undefined;
  const includeTotal = query.includeTotal;
  const fresh = query.fresh;
  const repo = await getPathRunRepository();
  scheduleStaleRunningCleanup(repo);
  const hasGlobalRunAccess = canAccessGlobalAiPathRuns(access);
  if (visibility === 'global' && !hasGlobalRunAccess) {
    throw forbiddenError('Global run access denied.');
  }
  const cacheKey = JSON.stringify({
    visibility,
    userScope: visibility === 'global' ? 'global' : access.userId,
    pathId: pathId ?? null,
    nodeId: nodeId ?? null,
    requestId: requestId ?? null,
    query: searchQuery ?? null,
    source: source ?? null,
    sourceMode,
    status: status ?? null,
    limit: limit ?? null,
    offset: offset ?? null,
    includeTotal,
  });
  const now = Date.now();
  if (!fresh && runsListResponseCacheTtlMs > 0) {
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
    ...(visibility === 'scoped' ? { userId: access.userId } : {}),
    ...(pathId ? { pathId } : {}),
    ...(nodeId ? { nodeId } : {}),
    ...(requestId ? { requestId } : {}),
    ...(searchQuery ? { query: searchQuery } : {}),
    ...(source ? { source, sourceMode } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(includeTotal ? {} : { includeTotal: false }),
  });
  if (!fresh && runsListResponseCacheTtlMs > 0) {
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
  const query = deleteQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const scope = query.scope;
  const pathId = query.pathId ?? undefined;
  const source = query.source ?? undefined;
  const sourceMode = query.sourceMode;

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
  const result = await deletePathRunsWithRepository(repo, listOptions);

  return NextResponse.json({ deleted: result.count, scope });
}
