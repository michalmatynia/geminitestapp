import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import { updateSocialPublishingPost } from '@/features/filemaker/social/server/social-posts-repository';
import {
  enqueueSocialPublishingPipelineJob,
  recoverSocialPublishingPipelineQueue,
  startSocialPublishingPipelineQueue,
} from '@/features/filemaker/social/workers/socialPublishingPipelineQueue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

const bodySchema = z.object({
  postId: z.string().trim().optional(),
  visionModelId: z.string().trim().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
});

export async function postSocialPublishingPostAnalyzeVisualsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can analyze social post visuals.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  const imageAddonIds = parsed.imageAddonIds.map((id) => id.trim()).filter(Boolean);
  const normalizedPostId = parsed.postId?.trim() || null;

  try {
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
      type: 'manual-post-visual-analysis',
      input: {
        postId: normalizedPostId,
        visionModelId: parsed.visionModelId?.trim() || null,
        imageAddonIds,
        actorId: actor.actorId,
      },
    });

    if (normalizedPostId) {
      await updateSocialPublishingPost(normalizedPostId, {
        visualAnalysisStatus: 'queued',
        visualAnalysisJobId: jobId,
        visualAnalysisModelId: parsed.visionModelId?.trim() || null,
        visualAnalysisError: null,
        updatedBy: actor.actorId,
      }).catch(() => null);
    }

    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.analyze-visuals',
      message: 'Social publishing visual analysis queued',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 202,
      context: {
        postId: parsed.postId ?? null,
        normalizedPostId,
        imageAddonCount: imageAddonIds.length,
        durationMs: Date.now() - startedAt,
        jobId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        jobType: 'manual-post-visual-analysis',
      },
      {
        status: 202,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.analyze-visuals',
      action: 'apiAnalyzeVisuals',
      postId: normalizedPostId,
      imageAddonCount: imageAddonIds.length,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
