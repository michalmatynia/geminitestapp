export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import {
  badRequestError,
  conflictError,
  notFoundError,
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const jobActionSchema = z.object({
  action: z.string().trim().optional(),
});

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError('Job not found.');
  }
  return NextResponse.json({ job });
}

async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const result = await parseJsonBody(req, jobActionSchema, {
    logPrefix: 'chatbot.jobs.POST',
  });
  if (!result.ok) {
    return result.response;
  }
  
  const { data } = result;
  if (data.action !== 'cancel') {
    throw badRequestError('Unsupported action.');
  }
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError('Job not found.');
  }
  if (['completed', 'failed', 'canceled'].includes(job.status)) {
    return NextResponse.json({ status: job.status });
  }
  const updated = await chatbotJobRepository.update(jobId, {
    status: 'canceled',
    finishedAt: new Date(),
  });
  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][POST] Canceled', { 
      jobId,
      requestId: ctx.requestId 
    });
  }
  return NextResponse.json({ status: updated?.status });
}

async function DELETE_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError('Job not found.');
  }
  const force = req.nextUrl.searchParams.get('force') === 'true';
  if (job.status === 'running' && !force) {
    throw conflictError('Job is running. Cancel it before deleting.');
  }
  if (job.status === 'running' && force) {
    await chatbotJobRepository.update(jobId, {
      status: 'failed',
      finishedAt: new Date(),
    });
  }
  await chatbotJobRepository.delete(jobId);
  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][DELETE] Deleted', { 
      jobId,
      requestId: ctx.requestId 
    });
  }
  return NextResponse.json({ deleted: true });
}

export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, { source: 'chatbot.jobs.[jobId].GET' });
export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, { source: 'chatbot.jobs.[jobId].POST' });
export const DELETE = apiHandlerWithParams<{ jobId: string }>(DELETE_handler, { source: 'chatbot.jobs.[jobId].DELETE' });
