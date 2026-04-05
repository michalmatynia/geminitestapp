import { NextRequest, NextResponse } from 'next/server';

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

const parseRunId = (params: { runId: string }): string => {
  const parsed = aiPathRunRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.runId;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const runId = parseRunId(params);
  const repoSelection = await resolvePathRunRepository();
  const repo = repoSelection.repo;
  let readProvider = repoSelection.provider;
  const readMode = 'selected' as const;
  let run = await repo.findRunById(runId);
  if (run === null) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, run);
  const readRepo = repo;
  const nodes = await readRepo.listRunNodes(runId);
  const events = await readRepo.listRunEvents(runId);
  const runMeta = run.meta && typeof run.meta === 'object' ? run.meta : null;
  const compile =
    runMeta?.['graphCompile'] && typeof runMeta['graphCompile'] === 'object'
      ? (runMeta['graphCompile'] as Record<string, unknown>)
      : null;
  const errorSummary = buildAiPathRunErrorSummary({ run, nodes, events });
  const writerSelection = readPersistedRunRepositorySelection(run.meta);
  const repositoryMismatch = hasRunRepositorySelectionMismatch(writerSelection, repoSelection);

  const headers = new Headers({
    'X-Ai-Paths-Run-Provider': repoSelection.provider,
    'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode,
    'X-Ai-Paths-Run-Read-Provider': readProvider,
    'X-Ai-Paths-Run-Read-Mode': readMode,
  });
  if (writerSelection?.provider) {
    headers.set('X-Ai-Paths-Run-Writer-Provider', writerSelection.provider);
  }
  if (writerSelection?.routeMode) {
    headers.set('X-Ai-Paths-Run-Writer-Route-Mode', writerSelection.routeMode);
  }
  if (repositoryMismatch) {
    headers.set('X-Ai-Paths-Run-Provider-Mismatch', '1');
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
          readProvider,
          readMode,
        },
        writer: writerSelection,
        mismatch: repositoryMismatch,
      },
    },
    {
      headers: Object.fromEntries(headers.entries()),
    }
  );
}

export async function DELETE_handler(
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
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, run);
  const deleted = await deletePathRunWithRepository(repo, runId);
  if (!deleted) {
    throw notFoundError('Run not found', { runId });
  }
  return NextResponse.json({ deleted: true, runId });
}
