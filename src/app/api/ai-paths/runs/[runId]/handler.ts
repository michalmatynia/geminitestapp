/**
 * AI Path Run Handler
 * 
 * Provides API endpoints for retrieving metadata, nodes, and events for a specific 
 * AI Path run, and for cancelling/deleting runs.
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { deletePathRunWithRepository } from '@/features/ai/ai-paths/server';
import { aiPathRunRouteParamsSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { buildAiPathRunErrorSummary } from '@/shared/lib/ai-paths/error-reporting';
import {
  hasRunRepositorySelectionMismatch,
  readPersistedRunRepositorySelection,
  resolvePathRunRepository,
} from '@/shared/lib/ai-paths/services/path-run-repository';

type RunRepositorySelection = Awaited<ReturnType<typeof resolvePathRunRepository>>;

const parseRunRepositoryGraphCompile = (
  runMeta: Record<string, unknown> | null
): Record<string, unknown> | null => {
  const graphCompile = runMeta?.['graphCompile'];
  return graphCompile !== null && typeof graphCompile === 'object'
    ? (graphCompile as Record<string, unknown>)
    : null;
};

const buildRunRepositoryHeaders = (
  repoSelection: RunRepositorySelection,
  readProvider: RunRepositorySelection['provider'],
  writerSelection: ReturnType<typeof readPersistedRunRepositorySelection>
): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-Ai-Paths-Run-Provider': repoSelection.provider,
    'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode,
    'X-Ai-Paths-Run-Read-Provider': readProvider,
    'X-Ai-Paths-Run-Read-Mode': 'selected',
  };
  if (writerSelection !== null) {
    const { provider, routeMode } = writerSelection;
    if (provider !== null) {
      headers['X-Ai-Paths-Run-Writer-Provider'] = provider;
    }
    if (routeMode !== null) {
      headers['X-Ai-Paths-Run-Writer-Route-Mode'] = routeMode;
    }
  }
  return headers;
};

const parseRunId = (params: { runId: string }): string => {
  const parsed = aiPathRunRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.runId;
};

/**
 * Retrieves AI Path run data including nodes, events, and repository status.
 * Requires AI Path run access.
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const runId = parseRunId(params);
  const repoSelection = await resolvePathRunRepository();
  const repo = repoSelection.repo;
  const run = await repo.findRunById(runId);
  if (run === null) {
    throw notFoundError(`Run with id "${runId}" not found.`, { runId, action: 'findRunById' });
  }
  assertAiPathRunAccess(access, run);
  const [nodes, events] = await Promise.all([repo.listRunNodes(runId), repo.listRunEvents(runId)]);
  const runMeta = run.meta && typeof run.meta === 'object' ? run.meta : null;
  const compile = parseRunRepositoryGraphCompile(runMeta);
  const errorSummary = buildAiPathRunErrorSummary({ run, nodes, events });
  const writerSelection = readPersistedRunRepositorySelection(run.meta);
  const repositoryMismatch = hasRunRepositorySelectionMismatch(writerSelection, repoSelection);

  const headers = buildRunRepositoryHeaders(repoSelection, repoSelection.provider, writerSelection);
  if (repositoryMismatch) {
    headers['X-Ai-Paths-Run-Provider-Mismatch'] = '1';
  }

  return NextResponse.json(
    {
      run,
      nodes,
      events,
      compile,
      errorSummary,
      repository: {
        reader: {
          collection: repoSelection.collection,
          selectedProvider: repoSelection.provider,
          selectedRouteMode: repoSelection.routeMode,
          readProvider: repoSelection.provider,
          readMode: 'selected',
        },
        writer: writerSelection,
        mismatch: repositoryMismatch,
      },
    },
    {
      headers,
    }
  );
}

/**
 * Deletes an AI Path run if the authenticated user has appropriate access.
 * Enforces rate limiting on delete actions.
 */
export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-delete');
  const runId = parseRunId(params);
  const repo = (await resolvePathRunRepository()).repo;
  const run = await repo.findRunById(runId);
  if (run === null) {
    throw notFoundError(`Run with id "${runId}" not found, cannot delete.`, { runId, action: 'delete' });
  }
  assertAiPathRunAccess(access, run);
  const deleted = await deletePathRunWithRepository(repo, runId);
  if (!deleted) {
    throw notFoundError(`Run with id "${runId}" could not be deleted.`, { runId, action: 'delete' });
  }
  return NextResponse.json({ deleted: true, runId });
}
