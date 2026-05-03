import { type NextRequest, NextResponse } from 'next/server';

import { resolveImageStudioContextRegistryEnvelope } from '@/features/ai/image-studio/context-registry/server';
import {
  imageStudioRunRequestSchema,
  resolveExpectedOutputCount,
  sanitizeImageStudioProjectId,
} from '@/features/ai/image-studio/server/run-executor';
import {
  createImageStudioRun,
  getImageStudioRunById,
  updateImageStudioRun,
} from '@/features/ai/server';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
} from '@/features/ai/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = imageStudioRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const projectId = sanitizeImageStudioProjectId(parsed.data.projectId);
  if (!projectId) {
    throw badRequestError('Project id is required.');
  }

  const contextRegistry = await resolveImageStudioContextRegistryEnvelope(
    parsed.data.contextRegistry ?? null
  );
  const request = {
    ...parsed.data,
    projectId,
    ...(contextRegistry ? { contextRegistry } : {}),
  };
  const operation = request.operation === 'center_object' ? 'center_object' : 'generate';
  const operationLabel = operation === 'center_object' ? 'Center object' : 'Generation';

  const expectedOutputs = resolveExpectedOutputCount(request);
  const run = await createImageStudioRun({
    projectId,
    request,
    expectedOutputs,
  });

  let dispatchMode: 'queued' | 'inline';
  try {
    startImageStudioRunQueue();
    dispatchMode = await enqueueImageStudioRunJob(run.id);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to dispatch Image Studio run.';
    await updateImageStudioRun(run.id, {
      status: 'failed',
      errorMessage,
      finishedAt: new Date().toISOString(),
      appendHistoryEvents: [
        {
          type: 'dispatch_failed',
          source: 'queue',
          message: `Failed to dispatch ${operationLabel.toLowerCase()} run.`,
          payload: {
            runId: run.id,
            operation,
            reason: errorMessage,
          },
        },
      ],
    });
    throw operationFailedError('Failed to dispatch Image Studio run.', {
      runId: run.id,
      reason: errorMessage,
    });
  }

  const latestRun =
    (await updateImageStudioRun(run.id, {
      dispatchMode,
      appendHistoryEvents: [
        {
          type: 'dispatched',
          source: 'queue',
          message:
            dispatchMode === 'queued'
              ? `${operationLabel} run dispatched to Redis queue.`
              : `${operationLabel} run dispatched inline (Redis unavailable).`,
          payload: {
            runId: run.id,
            operation,
            dispatchMode,
            expectedOutputs: run.expectedOutputs,
          },
        },
      ],
    })) ??
    (await getImageStudioRunById(run.id)) ??
    run;

  return NextResponse.json({
    runId: latestRun.id,
    status: latestRun.status,
    expectedOutputs: latestRun.expectedOutputs,
    dispatchMode,
  });
}
