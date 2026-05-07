import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import {
  enqueueSocialPublishingPipelineJob,
  recoverSocialPublishingPipelineQueue,
  startSocialPublishingPipelineQueue,
} from '@/features/filemaker/social/workers/socialPublishingPipelineQueue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';
import { socialPublishingVisualAnalysisSchema } from '@/shared/contracts/social-publishing-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

const bodySchema = z.object({
  docReferences: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().optional(),
  postId: z.string().trim().optional(),
  modelId: z.string().trim().optional(),
  visionModelId: z.string().trim().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).optional(),
  projectUrl: z.string().trim().optional(),
  prefetchedVisualAnalysis: socialPublishingVisualAnalysisSchema.optional(),
  requireVisualAnalysisInBody: z.boolean().optional(),
});

export async function postSocialPublishingPostGenerateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can generate social posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(parsed.projectUrl);
  const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);

  const imageAddonIds = (parsed.imageAddonIds ?? []).map((id) => id.trim()).filter(Boolean);

  try {
    if (projectUrlError) {
      throw operationFailedError(projectUrlError);
    }

    if (!isRedisAvailable()) {
      throw operationFailedError(
        'Social pipeline queue is not available. Configure REDIS_URL and start Redis.'
      );
    }

    const redisReachable = await isRedisReachable();
    if (!redisReachable) {
      throw operationFailedError(
        'Social pipeline queue is not available. Redis is configured but unreachable.'
      );
    }

    await recoverSocialPublishingPipelineQueue();
    startSocialPublishingPipelineQueue();

    const jobId = await enqueueSocialPublishingPipelineJob({
      type: 'manual-post-generation',
      input: {
        postId: parsed.postId?.trim() || null,
        docReferences: parsed.docReferences ?? [],
        notes: parsed.notes ?? '',
        modelId: parsed.modelId?.trim() || null,
        visionModelId: parsed.visionModelId?.trim() || null,
        imageAddonIds,
        projectUrl: normalizedProjectUrl,
        prefetchedVisualAnalysis: parsed.prefetchedVisualAnalysis,
        requireVisualAnalysisInBody: parsed.requireVisualAnalysisInBody ?? false,
        actorId: actor.actorId,
      },
    });

    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.generate',
      message: 'Social publishing post generation queued',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 202,
      context: {
        postId: parsed.postId ?? null,
        docReferenceCount: parsed.docReferences?.length ?? 0,
        imageAddonCount: imageAddonIds.length,
        notesLength: parsed.notes?.trim().length ?? 0,
        durationMs: Date.now() - startedAt,
        jobId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        jobType: 'manual-post-generation',
      },
      {
        status: 202,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.generate',
      action: 'apiGenerate',
      postId: parsed.postId ?? null,
      docReferenceCount: parsed.docReferences?.length ?? 0,
      imageAddonCount: imageAddonIds.length,
      notesLength: parsed.notes?.trim().length ?? 0,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
