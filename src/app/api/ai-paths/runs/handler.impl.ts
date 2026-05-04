import { type NextRequest, NextResponse } from 'next/server';

import {
  canAccessGlobalAiPathRuns,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { deletePathRunsWithRepository } from '@/features/ai/ai-paths/server';
import type {
  AiPathRunListOptions,
  AiPathRunListResult,
  AiPathRunsDeleteQuery,
  AiPathRunsListQuery,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import {
  hasRunRepositorySelectionMismatch,
  readPersistedRunRepositorySelection,
  resolvePathRunRepository,
} from '@/shared/lib/ai-paths/services/path-run-repository';
import type { PersistedRunRepositorySelection } from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  deleteQuerySchema,
  listQuerySchema,
  resolveAiPathRunsQueryInput,
  TERMINAL_STATUSES,
} from './query-schemas';

type RunRepository = ReturnType<typeof resolvePathRunRepository>;

type RunRepositorySelection = Awaited<RunRepository>;

type CachedRunsPayload = {
  readonly runs: AiPathRunListResult['runs'];
  readonly total: number;
};

type CachedRunsEntry = {
  readonly expiresAt: number;
  readonly payload: CachedRunsPayload;
};

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

const runsListResponseCache = new Map<string, CachedRunsEntry>();

export const TEST_ONLY = {
  clearRunsListResponseCache(): void {
    runsListResponseCache.clear();
  },
};

const createRunsCacheKey = (query: AiPathRunsListQuery, access: { userId: string }): string => {
  return JSON.stringify({
    visibility: query.visibility,
    userScope: query.visibility === 'global' ? 'global' : access.userId,
    pathId: query.pathId,
    nodeId: query.nodeId,
    requestId: query.requestId,
    query: query.query,
    source: query.source,
    sourceMode: query.sourceMode,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
    includeTotal: query.includeTotal,
  });
};

const pruneRunsListResponseCache = (now: number): void => {
  for (const [key, entry] of runsListResponseCache.entries()) {
    if (entry.expiresAt <= now) runsListResponseCache.delete(key);
  }

  const overflow = runsListResponseCache.size - runsListResponseCacheMaxEntries;
  if (overflow <= 0) {
    return;
  }

  let removed = 0;
  for (const key of runsListResponseCache.keys()) {
    runsListResponseCache.delete(key);
    removed += 1;
    if (removed >= overflow) {
      return;
    }
  }
};

const resolveMismatchedRunRepositorySelections = (
  runs: CachedRunsPayload['runs'],
  repoSelection: RunRepositorySelection
): PersistedRunRepositorySelection[] => {
  const writerSelections = runs.map((run) => readPersistedRunRepositorySelection(run.meta));
  return writerSelections.filter(
    (writerSelection): writerSelection is PersistedRunRepositorySelection =>
      writerSelection !== null && hasRunRepositorySelectionMismatch(writerSelection, repoSelection)
  );
};

const summarizeRunRepositoryMismatch = (
  runs: CachedRunsPayload['runs'],
  repoSelection: RunRepositorySelection
): {
  readonly mismatchCount: number;
  readonly firstWriterProvider: 'mongodb' | null;
  readonly firstWriterRouteMode: 'explicit' | 'fallback' | null;
} => {
  const mismatchedSelections = resolveMismatchedRunRepositorySelections(runs, repoSelection);
  const mismatchCount = mismatchedSelections.length;
  const firstWriterSelection = mismatchedSelections[0];
  return {
    mismatchCount,
    firstWriterProvider: firstWriterSelection?.provider ?? null,
    firstWriterRouteMode: firstWriterSelection?.routeMode ?? null,
  };
};

const buildRunRepositoryHeaders = (
  runs: CachedRunsPayload['runs'],
  repoSelection: RunRepositorySelection,
  options?: {
    readProvider?: RunRepositorySelection['provider'];
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

  const { mismatchCount, firstWriterProvider, firstWriterRouteMode } = summarizeRunRepositoryMismatch(
    runs,
    repoSelection
  );

  if (mismatchCount <= 0) {
    return Object.fromEntries(headers.entries());
  }

  headers.set('X-Ai-Paths-Run-Provider-Mismatch', '1');
  headers.set('X-Ai-Paths-Run-Provider-Mismatch-Count', String(mismatchCount));

  if (firstWriterProvider !== null) {
    headers.set('X-Ai-Paths-Run-Writer-Provider', firstWriterProvider);
  }

  if (firstWriterRouteMode !== null) {
    headers.set('X-Ai-Paths-Run-Writer-Route-Mode', firstWriterRouteMode);
  }

  return Object.fromEntries(headers.entries());
};

const getCachedResponse = (
  cacheKey: string,
  now: number,
  repoSelection: RunRepositorySelection
): NextResponse<CachedRunsPayload> | null => {
  const cached = runsListResponseCache.get(cacheKey);
  if (cached?.expiresAt === undefined || cached.expiresAt <= now) {
    return null;
  }
  return NextResponse.json(cached.payload, {
    headers: {
      ...buildRunRepositoryHeaders(cached.payload.runs, repoSelection),
      'Cache-Control': 'no-store',
      'X-Ai-Poll-Guard': 'runs-cache-hit',
    },
  });
};

const addOptionalListOption = <K extends keyof AiPathRunListOptions>(
  options: AiPathRunListOptions,
  key: K,
  value: AiPathRunListOptions[K] | undefined
): AiPathRunListOptions => {
  return value === undefined ? options : { ...options, [key]: value };
};

const buildListOptions = (
  query: AiPathRunsListQuery,
  access: { userId: string }
): AiPathRunListOptions => {
  const visibilityScopedOptions: AiPathRunListOptions =
    query.visibility === 'scoped' ? { userId: access.userId } : {};
  const withPathId = addOptionalListOption(
    visibilityScopedOptions,
    'pathId',
    query.pathId
  );
  const withNodeId = addOptionalListOption(withPathId, 'nodeId', query.nodeId);
  const withRequestId = addOptionalListOption(withNodeId, 'requestId', query.requestId);
  const withQuery = addOptionalListOption(withRequestId, 'query', query.query);
  const withStatus = addOptionalListOption(withQuery, 'status', query.status);
  const withLimit = addOptionalListOption(withStatus, 'limit', query.limit);
  const withOffset = addOptionalListOption(withLimit, 'offset', query.offset);
  const withSource =
    query.source === undefined
      ? withOffset
      : { ...withOffset, source: query.source, sourceMode: query.sourceMode };
  return {
    includeTotal: query.includeTotal,
    ...withSource,
  };
};

const getCachedPathRunsResponse = (
  query: AiPathRunsListQuery,
  access: { userId: string },
  repoSelection: RunRepositorySelection
): NextResponse<CachedRunsPayload> | null => {
  if (runsListResponseCacheTtlMs <= 0 || query.fresh) {
    return null;
  }

  const now = Date.now();
  pruneRunsListResponseCache(now);
  const cacheKey = createRunsCacheKey(query, access);
  return getCachedResponse(cacheKey, now, repoSelection);
};

const setCachedPathRunsResponse = (
  query: AiPathRunsListQuery,
  access: { userId: string },
  result: AiPathRunListResult
): void => {
  if (runsListResponseCacheTtlMs <= 0 || query.fresh) {
    return;
  }

  const now = Date.now();
  const cacheKey = createRunsCacheKey(query, access);
  runsListResponseCache.set(cacheKey, {
    expiresAt: now + runsListResponseCacheTtlMs,
    payload: {
      runs: result.runs,
      total: result.total,
    },
  });
};

export async function getPathRunsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const query: AiPathRunsListQuery = listQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const repoSelection = await resolvePathRunRepository();

  if (query.visibility === 'global' && !canAccessGlobalAiPathRuns(access)) {
    throw forbiddenError('Global run access denied.');
  }

  const cachedResponse = getCachedPathRunsResponse(query, access, repoSelection);
  if (cachedResponse !== null) return cachedResponse;

  const listOptions = buildListOptions(query, access);
  const result = await repoSelection.repo.listRuns(listOptions);
  setCachedPathRunsResponse(query, access, result);

  return NextResponse.json(result, {
    headers: {
      ...buildRunRepositoryHeaders(result.runs, repoSelection),
      'Cache-Control': 'no-store',
    },
  });
}

export async function deletePathRunsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'runs-clear');
  const query: AiPathRunsDeleteQuery = deleteQuerySchema.parse(resolveAiPathRunsQueryInput(req, _ctx));
  const { repo } = await resolvePathRunRepository();

  const listOptions: AiPathRunListOptions = {};
  if (!canAccessGlobalAiPathRuns(access)) {
    listOptions.userId = access.userId;
  }
  if (query.pathId !== undefined) {
    listOptions.pathId = query.pathId;
  }
  if (query.source !== undefined) {
    listOptions.source = query.source;
    listOptions.sourceMode = query.sourceMode;
  }
  if (query.scope === 'terminal') {
    listOptions.statuses = TERMINAL_STATUSES;
  }

  const result = await deletePathRunsWithRepository(repo, listOptions);
  return NextResponse.json({
    deleted: result.count,
    scope: query.scope,
  });
}
