import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Job, Queue } from 'bullmq';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurSocialPipelineQueue } from '@/features/kangur/social/workers/kangurSocialPipelineQueue';
import {
  kangurSocialManualGenerationProgressSchema,
  kangurSocialManualPipelineProgressSchema,
  kangurSocialManualVisualAnalysisProgressSchema,
} from '@/shared/contracts/kangur-social-pipeline';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
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
  progress: unknown;
  result: unknown;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  timestamp: number;
  duration: number | null;
};

const sanitizeJobData = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return data;
  const typedData = data as { type?: string };
  if (typedData.type === 'manual-post-pipeline') {
    const manual = data as {
      type: 'manual-post-pipeline';
      input?: {
        postId?: string;
        docReferences?: string[];
        imageAddonIds?: string[];
        imageAssets?: unknown[];
      };
    };

    return {
      type: manual.type,
      input: {
        postId: manual.input?.postId ?? null,
        docReferenceCount: manual.input?.docReferences?.length ?? 0,
        imageAddonCount: manual.input?.imageAddonIds?.length ?? 0,
        imageAssetCount: manual.input?.imageAssets?.length ?? 0,
      },
    };
  }

  if (typedData.type === 'manual-post-visual-analysis') {
    const manual = data as {
      type: 'manual-post-visual-analysis';
      input?: {
        postId?: string | null;
        imageAddonIds?: string[];
      };
    };

    return {
      type: manual.type,
      input: {
        postId: manual.input?.postId ?? null,
        imageAddonCount: manual.input?.imageAddonIds?.length ?? 0,
      },
    };
  }

  if (typedData.type === 'manual-post-generation') {
    const manual = data as {
      type: 'manual-post-generation';
      input?: {
        postId?: string | null;
        docReferences?: string[];
        imageAddonIds?: string[];
        prefetchedVisualAnalysis?: unknown;
        requireVisualAnalysisInBody?: boolean;
      };
    };

    return {
      type: manual.type,
      input: {
        postId: manual.input?.postId ?? null,
        docReferenceCount: manual.input?.docReferences?.length ?? 0,
        imageAddonCount: manual.input?.imageAddonIds?.length ?? 0,
        usesVisualAnalysisContext: Boolean(
          manual.input?.prefetchedVisualAnalysis || manual.input?.requireVisualAnalysisInBody
        ),
      },
    };
  }

  return data;
};

const sanitizeJobProgress = (
  progress: unknown,
  options?: { full?: boolean }
): unknown => {
  const manualPipeline = kangurSocialManualPipelineProgressSchema.safeParse(progress);
  if (manualPipeline.success) {
    const value = manualPipeline.data;
    const summary = {
      type: value.type,
      step: value.step,
      captureMode: value.captureMode,
      message: value.message,
      updatedAt: value.updatedAt,
      contextDocCount: value.contextDocCount,
      addonsCreated: value.addonsCreated,
      captureFailureCount: value.captureFailureCount,
      requestedPresetCount: value.requestedPresetCount,
      usedPresetCount: value.usedPresetCount,
      captureCompletedCount: value.captureCompletedCount,
      captureRemainingCount: value.captureRemainingCount,
      captureTotalCount: value.captureTotalCount,
      runId: value.runId,
    };

    if (!options?.full) {
      return summary;
    }

    return {
      ...summary,
      contextSummary: value.contextSummary,
      captureFailures: value.captureFailures,
      usedPresetIds: value.usedPresetIds,
    };
  }

  const visualAnalysis = kangurSocialManualVisualAnalysisProgressSchema.safeParse(progress);
  if (visualAnalysis.success) {
    return visualAnalysis.data;
  }

  const manualGeneration = kangurSocialManualGenerationProgressSchema.safeParse(progress);
  if (manualGeneration.success) {
    return manualGeneration.data;
  }

  return null;
};

const sanitizeJobResult = (
  result: unknown,
  options?: { full?: boolean }
): unknown => {
  if (!result || typeof result !== 'object') return result;
  const typedResult = result as { type?: string };
  if (typedResult.type === 'manual-post-pipeline') {
    const manual = result as {
      type: 'manual-post-pipeline';
      postId?: string;
      captureMode?: string;
      addonsCreated?: number;
      failures?: number;
      runId?: string;
      contextSummary?: string | null;
      contextDocCount?: number;
      imageAddonIds?: string[];
      imageAssets?: unknown[];
      batchCaptureResult?: unknown;
      generatedPost?: unknown;
    };

    const summary = {
      type: manual.type,
      postId: manual.postId ?? null,
      captureMode: manual.captureMode ?? 'fresh_capture',
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
    };
  }

  if (typedResult.type === 'manual-post-visual-analysis') {
    const manual = result as {
      type: 'manual-post-visual-analysis';
      postId?: string | null;
      imageAddonIds?: string[];
      analysis?: {
        summary?: string;
        highlights?: unknown[];
      };
      savedPost?: unknown;
    };

    const summary = {
      type: manual.type,
      postId: manual.postId ?? null,
      imageAddonCount: manual.imageAddonIds?.length ?? 0,
      highlightCount: manual.analysis?.highlights?.length ?? 0,
    };

    if (!options?.full) {
      return summary;
    }

    return {
      ...summary,
      analysis: manual.analysis ?? null,
      savedPost: manual.savedPost ?? null,
    };
  }

  if (typedResult.type === 'manual-post-generation') {
    const manual = result as {
      type: 'manual-post-generation';
      postId?: string | null;
      imageAddonIds?: string[];
      generatedPost?: unknown;
      draft?: unknown;
    };

    const summary = {
      type: manual.type,
      postId: manual.postId ?? null,
      imageAddonCount: manual.imageAddonIds?.length ?? 0,
      saved: Boolean(manual.generatedPost),
    };

    if (!options?.full) {
      return summary;
    }

    return {
      ...summary,
      generatedPost: manual.generatedPost ?? null,
      draft: manual.draft ?? null,
    };
  }

  return result;
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
    progress: sanitizeJobProgress(job.progress, options),
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
