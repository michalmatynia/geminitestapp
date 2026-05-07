import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import {
  enqueueSocialPublishingPipelineJob,
  recoverSocialPublishingPipelineQueue,
  startSocialPublishingPipelineQueue,
} from '@/features/filemaker/social/workers/socialPublishingPipelineQueue';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { imageFileSelectionSchema } from '@/shared/contracts/files';
import { socialPublishingVisualAnalysisSchema } from '@/shared/contracts/social-publishing-posts';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';

const editorStateSchema = z.object({
  titlePl: z.string().trim().max(200),
  titleEn: z.string().trim().max(200),
  bodyPl: z.string().trim().max(8000),
  bodyEn: z.string().trim().max(8000),
});

const manualPipelineInputSchema = z.object({
  postId: z.string().trim().min(1),
  editorState: editorStateSchema,
  imageAssets: z.array(imageFileSelectionSchema).max(30).default([]),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
  captureMode: z.enum(['existing_assets', 'fresh_capture']).default('fresh_capture'),
  batchCaptureBaseUrl: z.string().trim().url().optional(),
  batchCapturePresetIds: z.array(z.string().trim().min(1)).optional(),
  batchCapturePresetLimit: z.number().int().positive().nullable().optional(),
  publishingConnectionId: z.string().trim().nullable().optional(),
  brainModelId: z.string().trim().nullable().optional(),
  visionModelId: z.string().trim().nullable().optional(),
  projectUrl: z.string().trim().optional().default(''),
  generationNotes: z.string().trim().optional().default(''),
  docReferences: z.array(z.string().trim().min(1)).max(80).default([]),
  prefetchedVisualAnalysis: socialPublishingVisualAnalysisSchema.optional(),
  requireVisualAnalysisInBody: z.boolean().optional().default(false),
}).superRefine((value, ctx) => {
  if (value.captureMode === 'fresh_capture') {
    if (!value.batchCaptureBaseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['batchCaptureBaseUrl'],
        message: 'Fresh capture requires a batch capture base URL.',
      });
    }
    if (!value.batchCapturePresetIds || value.batchCapturePresetIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['batchCapturePresetIds'],
        message: 'Fresh capture requires at least one capture preset.',
      });
    }
  }
});

const manualVisualAnalysisInputSchema = z.object({
  postId: z.string().trim().optional(),
  visionModelId: z.string().trim().nullable().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
});

const manualGenerationInputSchema = z.object({
  postId: z.string().trim().optional(),
  docReferences: z.array(z.string().trim().min(1)).max(80).default([]),
  notes: z.string().trim().optional().default(''),
  modelId: z.string().trim().nullable().optional(),
  visionModelId: z.string().trim().nullable().optional(),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
  projectUrl: z.string().trim().optional().default(''),
  prefetchedVisualAnalysis: socialPublishingVisualAnalysisSchema.optional(),
  requireVisualAnalysisInBody: z.boolean().optional().default(false),
});

const bodySchema = z
  .object({
    jobType: z
      .enum([
        'pipeline-tick',
        'manual-post-pipeline',
        'manual-post-visual-analysis',
        'manual-post-generation',
      ])
      .optional(),
    input: z.unknown().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.jobType &&
      value.jobType !== 'pipeline-tick' &&
      !value.input
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['input'],
        message: 'Manual queue input is required.',
      });
    }
  });

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can trigger the social pipeline queue.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const jobType =
    parsed.jobType ??
    (parsed.input ? 'manual-post-pipeline' : 'pipeline-tick');
  const manualPipelineInput =
    jobType === 'manual-post-pipeline'
      ? manualPipelineInputSchema.parse(parsed.input ?? {})
      : null;
  const manualVisualAnalysisInput =
    jobType === 'manual-post-visual-analysis'
      ? manualVisualAnalysisInputSchema.parse(parsed.input ?? {})
      : null;
  const manualGenerationInput =
    jobType === 'manual-post-generation'
      ? manualGenerationInputSchema.parse(parsed.input ?? {})
      : null;
  const normalizedManualPipelineProjectUrl =
    manualPipelineInput
      ? normalizeSocialPublishingProjectUrl(manualPipelineInput.projectUrl)
      : '';
  const normalizedManualGenerationProjectUrl =
    manualGenerationInput
      ? normalizeSocialPublishingProjectUrl(manualGenerationInput.projectUrl)
      : '';
  const manualProjectUrlError = getSocialPublishingProjectUrlError(
    normalizedManualPipelineProjectUrl || normalizedManualGenerationProjectUrl
  );

  if (
    (jobType === 'manual-post-pipeline' || jobType === 'manual-post-generation') &&
    manualProjectUrlError
  ) {
    throw operationFailedError(manualProjectUrlError);
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

  const jobId =
    jobType === 'manual-post-pipeline'
      ? await enqueueSocialPublishingPipelineJob({
          type: 'manual-post-pipeline',
          input: {
            ...manualPipelineInput!,
            projectUrl: normalizedManualPipelineProjectUrl,
            actorId: actor.actorId,
            publishingConnectionId: manualPipelineInput?.publishingConnectionId ?? null,
            brainModelId: manualPipelineInput?.brainModelId ?? null,
            visionModelId: manualPipelineInput?.visionModelId ?? null,
            forwardCookies: req.headers.get('cookie') ?? '',
          },
        })
      : jobType === 'manual-post-visual-analysis'
        ? await enqueueSocialPublishingPipelineJob({
            type: 'manual-post-visual-analysis',
            input: {
              ...manualVisualAnalysisInput!,
              actorId: actor.actorId,
            },
          })
        : jobType === 'manual-post-generation'
          ? await enqueueSocialPublishingPipelineJob({
              type: 'manual-post-generation',
              input: {
                ...manualGenerationInput!,
                projectUrl: normalizedManualGenerationProjectUrl,
                actorId: actor.actorId,
              },
            })
      : await enqueueSocialPublishingPipelineJob({ type: 'pipeline-tick' });

  return NextResponse.json(
    { success: true, jobId, jobType },
    { status: 201 }
  );
}
