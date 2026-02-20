import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  normalizeCaseResolverPublicFilepath,
  resolveCaseResolverOcrDiskPath,
} from '@/features/case-resolver/server/ocr-runtime';
import {
  createCaseResolverOcrJob,
  getCaseResolverOcrJobById,
  markCaseResolverOcrJobFailed,
  setCaseResolverOcrJobDispatchMode,
} from '@/features/case-resolver/server/ocr-runtime-job-store';
import { DEFAULT_CASE_RESOLVER_OCR_PROMPT } from '@/features/case-resolver/settings';
import {
  enqueueCaseResolverOcrJob,
  startCaseResolverOcrQueue,
} from '@/features/jobs/workers/caseResolverOcrQueue';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const createCaseResolverOcrJobSchema = z.object({
  filepath: z.string().trim().min(1),
  model: z.string().trim().optional(),
  prompt: z.string().trim().optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createCaseResolverOcrJobSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const filepath = normalizeCaseResolverPublicFilepath(parsed.data.filepath);
  if (!filepath) {
    throw badRequestError('filepath is required.');
  }
  try {
    resolveCaseResolverOcrDiskPath(filepath);
  } catch (error) {
    throw badRequestError(error instanceof Error ? error.message : 'Invalid filepath.');
  }

  const runtimeModel = parsed.data.model?.trim() ?? '';
  const runtimePrompt = parsed.data.prompt?.trim() || DEFAULT_CASE_RESOLVER_OCR_PROMPT;
  const createdJob = await createCaseResolverOcrJob({ filepath });

  let dispatchMode: 'queued' | 'inline';
  try {
    startCaseResolverOcrQueue();
    dispatchMode = await enqueueCaseResolverOcrJob({
      jobId: createdJob.id,
      filepath,
      model: runtimeModel,
      prompt: runtimePrompt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to dispatch OCR runtime job.';
    await markCaseResolverOcrJobFailed(createdJob.id, message);
    throw operationFailedError('Failed to dispatch OCR runtime job.', {
      jobId: createdJob.id,
      reason: message,
    });
  }

  await setCaseResolverOcrJobDispatchMode(createdJob.id, dispatchMode);
  const latestJob = (await getCaseResolverOcrJobById(createdJob.id)) ?? createdJob;

  return NextResponse.json(
    {
      job: latestJob,
      dispatchMode,
    },
    { status: 201 }
  );
}
