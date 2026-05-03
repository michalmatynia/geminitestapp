import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import {
  enqueueCaseResolverOcrJob,
  startCaseResolverOcrQueue,
} from '@/features/case-resolver/server';
import {
  createCaseResolverOcrJob,
  getCaseResolverOcrJobById,
  markCaseResolverOcrJobFailed,
  setCaseResolverOcrJobDispatchMode,
} from '@/features/case-resolver/server';
import { DEFAULT_CASE_RESOLVER_OCR_PROMPT } from '@/features/case-resolver/server';
import { retryCaseResolverOcrJobSchema } from '@/shared/contracts/case-resolver/ocr';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const CASE_RESOLVER_OCR_DEFAULT_MAX_ATTEMPTS = 3;

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const jobId = params.jobId?.trim();
  if (!jobId) {
    throw badRequestError('Job id is required.');
  }

  const job = await getCaseResolverOcrJobById(jobId);
  if (!job) {
    throw notFoundError('OCR job not found.', { jobId });
  }

  return NextResponse.json({ job });
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const jobId = params.jobId?.trim();
  if (!jobId) {
    throw badRequestError('Job id is required.');
  }

  const sourceJob = await getCaseResolverOcrJobById(jobId);
  if (!sourceJob) {
    throw notFoundError('OCR job not found.', { jobId });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = retryCaseResolverOcrJobSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', {
      errors: parsed.error.format(),
    });
  }

  const runtimeModel = parsed.data.model?.trim() || sourceJob.model?.trim() || '';
  const runtimePrompt =
    parsed.data.prompt?.trim() || sourceJob.prompt?.trim() || DEFAULT_CASE_RESOLVER_OCR_PROMPT;
  const runtimeCorrelationId =
    parsed.data.correlationId?.trim() ||
    req.headers.get('x-correlation-id')?.trim() ||
    sourceJob.correlationId?.trim() ||
    `case-resolver-ocr-${randomUUID()}`;

  const retriedJob = await createCaseResolverOcrJob({
    filepath: sourceJob.filepath,
    model: runtimeModel || null,
    prompt: runtimePrompt,
    retryOfJobId: sourceJob.id,
    correlationId: runtimeCorrelationId,
    maxAttempts: sourceJob.maxAttempts || CASE_RESOLVER_OCR_DEFAULT_MAX_ATTEMPTS,
  });

  let dispatchMode: 'queued' | 'inline';
  try {
    startCaseResolverOcrQueue();
    dispatchMode = await enqueueCaseResolverOcrJob({
      jobId: retriedJob.id,
      filepath: retriedJob.filepath,
      model: runtimeModel,
      prompt: runtimePrompt,
      correlationId: runtimeCorrelationId,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message =
      error instanceof Error ? error.message : 'Failed to dispatch OCR runtime retry job.';
    await markCaseResolverOcrJobFailed(retriedJob.id, message);
    throw operationFailedError('Failed to dispatch OCR runtime retry job.', {
      jobId: retriedJob.id,
      retriedFromJobId: sourceJob.id,
      reason: message,
    });
  }

  await setCaseResolverOcrJobDispatchMode(retriedJob.id, dispatchMode);
  const latestJob = (await getCaseResolverOcrJobById(retriedJob.id)) ?? retriedJob;

  return NextResponse.json(
    {
      job: latestJob,
      dispatchMode,
      retriedFromJobId: sourceJob.id,
      correlationId: latestJob.correlationId ?? runtimeCorrelationId,
    },
    { status: 201 }
  );
}
