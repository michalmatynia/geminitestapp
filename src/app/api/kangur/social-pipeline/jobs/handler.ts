import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Job, Queue } from 'bullmq';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurSocialPipelineQueue } from '@/features/kangur/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError, forbiddenError, notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  id: optionalTrimmedQueryString(z.string().trim().min(1)).optional(),
});

export const deleteQuerySchema = z.object({
  id: z.string().trim().min(1),
});

type PipelineJobRecord = {
  id: string;
  status: string;
  data: unknown;
  result: unknown;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  timestamp: number;
  duration: number | null;
};

const sanitizeJobData = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return data;
  if ((data as { type?: string }).type !== 'manual-post-pipeline') return data;

  const manual = data as {
    type: 'manual-post-pipeline';
    input?: {
      postId?: string;
      docReferences?: string[];
      imageAddonIds?: string[];
    };
  };

  return {
    type: manual.type,
    input: {
      postId: manual.input?.postId ?? null,
      docReferenceCount: manual.input?.docReferences?.length ?? 0,
      imageAddonCount: manual.input?.imageAddonIds?.length ?? 0,
    },
  };
};

const sanitizeJobResult = (
  result: unknown,
  options?: { full?: boolean }
): unknown => {
  if (!result || typeof result !== 'object') return result;
  if ((result as { type?: string }).type !== 'manual-post-pipeline') return result;

  const manual = result as {
    type: 'manual-post-pipeline';
    postId?: string;
    addonsCreated?: number;
    failures?: number;
    runId?: string;
    contextSummary?: string | null;
    contextDocCount?: number;
    imageAddonIds?: string[];
    imageAssets?: unknown[];
    batchCaptureResult?: unknown;
    generatedPost?: unknown;
    docUpdates?: unknown;
  };

  const summary = {
    type: manual.type,
    postId: manual.postId ?? null,
    addonsCreated: manual.addonsCreated ?? 0,
    failures: manual.failures ?? 0,
    runId: manual.runId ?? null,
  };

  if (!options?.full) {
    return summary;
  }

  return {
    ...summary,
    contextSummary: manual.contextSummary ?? null,
    contextDocCount: manual.contextDocCount ?? 0,
    imageAddonIds: manual.imageAddonIds ?? [],
    imageAssets: manual.imageAssets ?? [],
    batchCaptureResult: manual.batchCaptureResult ?? null,
    generatedPost: manual.generatedPost ?? null,
    docUpdates: manual.docUpdates ?? null,
  };
};

const serializeJob = async (
  job: Job,
  options?: { full?: boolean }
): Promise<PipelineJobRecord> => {
  const status = await job.getState();
  const processedOn = job.processedOn ?? null;
  const finishedOn = job.finishedOn ?? null;
  return {
    id: job.id ?? 'unknown',
    status,
    data: sanitizeJobData(job.data),
    result: sanitizeJobResult(job.returnvalue ?? null, options),
    failedReason: job.failedReason ?? null,
    processedOn,
    finishedOn,
    timestamp: job.timestamp,
    duration:
      processedOn != null && finishedOn != null
        ? finishedOn - processedOn
        : null,
  };
};

export async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const managed = getKangurSocialPipelineQueue();
  await managed.getHealthStatus();
  const rawQueue = managed.getQueue() as Queue | null;

  if (!rawQueue) {
    return NextResponse.json(query.id ? null : [], { headers: { 'Cache-Control': 'no-store' } });
  }

  if (query.id) {
    const job = await rawQueue.getJob(query.id);
    if (!job) {
      return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(await serializeJob(job, { full: true }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const jobs: Job[] = await rawQueue.getJobs(
    ['completed', 'failed', 'active', 'waiting'],
    0,
    49
  );

  const records: PipelineJobRecord[] = await Promise.all(
    jobs.map((job) => serializeJob(job))
  );

  records.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json(records, { headers: { 'Cache-Control': 'no-store' } });
}

const TERMINAL_JOB_STATUSES = new Set(['completed', 'failed']);

export async function DELETE_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social pipeline jobs.');
  }

  const query = deleteQuerySchema.parse(ctx.query ?? {});
  const managed = getKangurSocialPipelineQueue();
  await managed.getHealthStatus();
  const rawQueue = managed.getQueue() as Queue | null;

  if (!rawQueue) {
    return NextResponse.json(
      { success: false, error: 'Redis not available' },
      { status: 503 }
    );
  }

  const job = await rawQueue.getJob(query.id);
  if (!job) {
    throw notFoundError('Job not found.');
  }

  const status = await job.getState();
  if (!TERMINAL_JOB_STATUSES.has(status)) {
    throw conflictError(
      `Job is ${status}. Only completed or failed pipeline jobs can be deleted.`
    );
  }

  await job.remove();

  return NextResponse.json({
    success: true,
    deleted: true,
    jobId: query.id,
  });
}
