import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProductAiJob, cancelProductAiJob, deleteProductAiJob } from '@/features/jobs/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const actionSchema = z.object({
  action: z.string().trim().min(1),
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required. Provide a non-empty jobId in the URL path.');
  }
  const job = await getProductAiJob(jobId);
  if (!job) {
    throw notFoundError(`Job "${jobId}" not found. The job may have completed and been cleaned up, or the id is incorrect.`, { jobId });
  }
  return NextResponse.json({ job });
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required. Provide a non-empty jobId in the URL path.');
  }
  const parsed = await parseJsonBody(req, actionSchema, {
    logPrefix: 'products.ai-jobs.job.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { action } = parsed.data;
  if (action === 'cancel') {
    const job = await cancelProductAiJob(jobId);
    return NextResponse.json({ success: true, job });
  }
  throw badRequestError(`Invalid action "${action}". The only supported action for product AI jobs is "cancel".`);
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required. Provide a non-empty jobId in the URL path.');
  }
  await deleteProductAiJob(jobId);
  return NextResponse.json({ success: true });
}
