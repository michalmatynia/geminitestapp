import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { updateKangurSocialPost } from '@/features/kangur/social/server/social-posts-repository';
import {
  enqueueKangurSocialPipelineJob,
  recoverKangurSocialPipelineQueue,
  startKangurSocialPipelineQueue,
} from '@/features/kangur/social/workers/kangurSocialPipelineQueue';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

const bodySchema = z.object({
  postId: z.string().trim().optional(),
  visionModelId: z.string().trim().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
});

export async function postKangurSocialPostAnalyzeVisualsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
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

    await recoverKangurSocialPipelineQueue();
    startKangurSocialPipelineQueue();

    const jobId = await enqueueKangurSocialPipelineJob({
      type: 'manual-post-visual-analysis',
      input: {
        postId: normalizedPostId,
        visionModelId: parsed.visionModelId?.trim() || null,
        imageAddonIds,
        actorId: actor.actorId,
      },
    });

    if (normalizedPostId) {
      await updateKangurSocialPost(normalizedPostId, {
        visualAnalysisStatus: 'queued',
        visualAnalysisJobId: jobId,
        visualAnalysisModelId: parsed.visionModelId?.trim() || null,
        visualAnalysisError: null,
        updatedBy: actor.actorId,
      }).catch(() => null);
    }

    void logKangurServerEvent({
      source: 'kangur.social-posts.analyze-visuals',
      message: 'Kangur social visual analysis queued',
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
      service: 'kangur.social-posts.analyze-visuals',
      action: 'apiAnalyzeVisuals',
      postId: normalizedPostId,
      imageAddonCount: imageAddonIds.length,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
