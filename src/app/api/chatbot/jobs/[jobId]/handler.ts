import { type NextRequest, NextResponse } from 'next/server';

import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import {
  chatbotJobActionRequestSchema,
  chatbotJobDeleteQuerySchema,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export { chatbotJobActionRequestSchema as jobActionSchema };
export { chatbotJobDeleteQuerySchema as deleteQuerySchema };

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError(`Job "${jobId}" not found. The job may have expired or the id is incorrect.`);
  }
  return NextResponse.json({ job });
}

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const result = await parseJsonBody(req, chatbotJobActionRequestSchema, {
    logPrefix: 'chatbot.jobs.POST',
  });
  if (!result.ok) {
    return result.response;
  }

  const { data } = result;
  if (data.action !== 'cancel') {
    throw badRequestError(`Unsupported action "${data.action}". The only supported action for chatbot jobs is "cancel".`);
  }
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError(`Job "${jobId}" not found. The job may have expired or the id is incorrect.`);
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
      requestId: ctx.requestId,
    });
  }
  return NextResponse.json({ status: updated?.status });
}

export async function deleteHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw notFoundError(`Job "${jobId}" not found. The job may have expired or the id is incorrect.`);
  }
  const query = chatbotJobDeleteQuerySchema.parse(ctx.query ?? {});
  const force = query.force === true;
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
      requestId: ctx.requestId,
    });
  }
  return NextResponse.json({ deleted: true });
}
