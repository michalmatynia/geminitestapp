import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  enqueueKangurSocialPipelineJob,
  recoverKangurSocialPipelineQueue,
  startKangurSocialPipelineQueue,
} from '@/features/kangur/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { imageFileSelectionSchema } from '@/shared/contracts/files';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { isRedisAvailable } from '@/shared/lib/queue';

const editorStateSchema = z.object({
  titlePl: z.string().trim().max(200),
  titleEn: z.string().trim().max(200),
  bodyPl: z.string().trim().max(8000),
  bodyEn: z.string().trim().max(8000),
});

const manualPipelineInputSchema = z.object({
  postId: z.string().trim().min(1),
  editorState: editorStateSchema,
  imageAssets: z.array(imageFileSelectionSchema).max(12).default([]),
  imageAddonIds: z.array(z.string().trim().min(1)).max(30).default([]),
  batchCaptureBaseUrl: z.string().trim().url(),
  batchCapturePresetIds: z.array(z.string().trim().min(1)).min(1),
  linkedinConnectionId: z.string().trim().nullable().optional(),
  brainModelId: z.string().trim().nullable().optional(),
  visionModelId: z.string().trim().nullable().optional(),
  projectUrl: z.string().trim().optional().default(''),
  generationNotes: z.string().trim().optional().default(''),
  docReferences: z.array(z.string().trim().min(1)).max(80).default([]),
});

const bodySchema = z
  .object({
    jobType: z.enum(['pipeline-tick', 'manual-post-pipeline']).optional(),
    input: manualPipelineInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.jobType === 'manual-post-pipeline' && !value.input) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['input'],
        message: 'Manual pipeline input is required.',
      });
    }
  });

export async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can trigger the social pipeline queue.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const jobType =
    parsed.jobType ??
    (parsed.input ? 'manual-post-pipeline' : 'pipeline-tick');

  await recoverKangurSocialPipelineQueue();
  startKangurSocialPipelineQueue();

  if (!isRedisAvailable()) {
    throw operationFailedError(
      'Social pipeline queue is not available. Configure REDIS_URL and start Redis.'
    );
  }

  const jobId =
    jobType === 'manual-post-pipeline'
      ? await enqueueKangurSocialPipelineJob({
          type: 'manual-post-pipeline',
          input: {
            ...parsed.input!,
            actorId: actor.actorId,
            linkedinConnectionId: parsed.input?.linkedinConnectionId ?? null,
            brainModelId: parsed.input?.brainModelId ?? null,
            visionModelId: parsed.input?.visionModelId ?? null,
            forwardCookies: req.headers.get('cookie') ?? '',
          },
        })
      : await enqueueKangurSocialPipelineJob({ type: 'pipeline-tick' });

  return NextResponse.json(
    { success: true, jobId, jobType },
    { status: 201 }
  );
}
