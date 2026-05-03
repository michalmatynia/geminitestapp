import { type NextRequest, NextResponse } from 'next/server';
import {
  canAccessGlobalAiPathRuns,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { deletePathRunsWithRepository } from '@/features/ai/ai-paths/server';
import type { AiPathRunListOptions, AiPathRunRepository } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  hasRunRepositorySelectionMismatch,
  readPersistedRunRepositorySelection,
  resolvePathRunRepository,
} from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  deleteQuerySchema,
  listQuerySchema,
  resolveAiPathRunsQueryInput,
  TERMINAL_STATUSES,
} from './query-schemas';

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const runsListResponseCacheTtlMs = parseEnvNumber(
  process.env['AI_PATHS_RUNS_LIST_CACHE_TTL_MS'],
  3_000
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
    if (entry.expiresAt <= now) runsListResponseCache.delete(key);
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

const buildRunRepositoryHeaders = (
  runs: unknown[],
  repoSelection: Awaited<ReturnType<typeof resolvePathRunRepository>>,
  options?: {
    readProvider?: 'mongodb';
    readMode?: 'selected';
  }
): Record<string, string> => {
  const headers = new Headers({
    'X-Ai-Poll-Guard': 'runs-fresh',
    'X-Ai-Paths-Run-Provider': repoSelection.provider,
    'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode,
    'X-Ai-Paths-Run-Read-Provider': options?.readProvider ?? repoSelection.provider,
    'X-Ai-Paths-Run-Read-Mode': options?.readMode ?? 'selected',
  });
  let mismatchCount = 0;
  let firstWriterProvider: string | null = null;
  let firstWriterRouteMode: string | null = null;

  runs.forEach((run) => {
    if (run === null || typeof run !== 'object' || Array.isArray(run)) return;
    const writerSelection = readPersistedRunRepositorySelection(
      (run as Record<string, unknown>)['meta']
    );
    if (!hasRunRepositorySelectionMismatch(writerSelection, repoSelection)) return;
    mismatchCount += 1;
    if (firstWriterProvider === null && writerSelection?.provider) {
      firstWriterProvider = writerSelection.provider;
    }
    if (firstWriterRouteMode === null && writerSelection?.routeMode) {
      firstWriterRouteMode = writerSelection.routeMode;
    }
  });

  if (mismatchCount > 0) {
    headers.set('X-Ai-Paths-Run-Provider-Mismatch', '1');
    headers.set('X-Ai-Paths-Run-Provider-Mismatch-Count', String(mismatchCount));
    if (firstWriterProvider !== null) headers.set('X-Ai-Paths-Run-Writer-Provider', firstWriterProvider);
    if (firstWriterRouteMode !== null) headers.set('X-Ai-Paths-Run-Writer-Route-Mode', firstWriterRouteMode);
  }

  return Object.fromEntries(headers.entries());
};

async function getCachedResponse(cacheKey: string, now: number, repoSelection: any): Promise<NextResponse | null> {
  const cached = runsListResponseCache.get(cacheKey);
  if (cached !== undefined && cached.expiresAt > now) {
    const headers = {
      ...buildRunRepositoryHeaders(cached.payload.runs, repoSelection),
      'Cache-Control': 'no-store',
      'X-Ai-Poll-Guard': 'runs-cache-hit',
    };
    return NextResponse.json(cached.payload, { headers });
  }
  return null;
}

export async function getPathRunsHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const query = listQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const { visibility, pathId, nodeId, requestId, query: searchQuery, source, sourceMode, status, limit, offset, includeTotal, fresh } = query;
  
  const repoSelection = await resolvePathRunRepository();
  const repo = repoSelection.repo;

  if (visibility === 'global' && !canAccessGlobalAiPathRuns(access)) {
    throw forbiddenError('Global run access denied.');
  }

  const cacheKey = JSON.stringify({ visibility, userScope: visibility === 'global' ? 'global' : access.userId, pathId: pathId ?? null, nodeId: nodeId ?? null, requestId: requestId ?? null, query: searchQuery ?? null, source: source ?? null, sourceMode, status: status ?? null, limit: limit ?? null, offset: offset ?? null, includeTotal });
  const now = Date.now();
  if (!fresh && runsListResponseCacheTtlMs > 0) {
    pruneRunsListResponseCache(now);
    const cachedResp = await getCachedResponse(cacheKey, now, repoSelection);
    if (cachedResp !== null) return cachedResp;
  }

  const result = await repo.listRuns({
    ...(visibility === 'scoped' ? { userId: access.userId } : {}),
    ...(typeof pathId === 'string' && pathId !== '' ? { pathId } : {}),
    ...(typeof nodeId === 'string' && nodeId !== '' ? { nodeId } : {}),
    ...(typeof requestId === 'string' && requestId !== '' ? { requestId } : {}),
    ...(typeof searchQuery === 'string' && searchQuery !== '' ? { query: searchQuery } : {}),
    ...(typeof source === 'string' && source !== '' ? { source, sourceMode } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(includeTotal ? {} : { includeTotal: false }),
  });

  if (!fresh && runsListResponseCacheTtlMs > 0) {
    runsListResponseCache.set(cacheKey, { expiresAt: now + runsListResponseCacheTtlMs, payload: result as { runs: unknown[]; total: number } });
  }

  return NextResponse.json(result, { headers: { ...buildRunRepositoryHeaders(result.runs, repoSelection), 'Cache-Control': 'no-store' } });
}

export async function deletePathRunsHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'runs-clear');
  const query = deleteQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const { scope, pathId, source, sourceMode } = query;

  const repo = (await resolvePathRunRepository()).repo;
  const listOptions: AiPathRunListOptions = {};
  if (!canAccessGlobalAiPathRuns(access)) listOptions.userId = access.userId;
  if (typeof pathId === 'string' && pathId !== '') listOptions.pathId = pathId;
  if (typeof source === 'string' && source !== '') {
    listOptions.source = source;
    listOptions.sourceMode = sourceMode;
  }
  if (scope === 'terminal') listOptions.statuses = TERMINAL_STATUSES;
  
  const result = await deletePathRunsWithRepository(repo, listOptions);
  return NextResponse.json({ deleted: result.count, scope });
}
