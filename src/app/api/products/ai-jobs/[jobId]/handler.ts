import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProductAiJob, cancelProductAiJob, deleteProductAiJob } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const actionSchema = z.object({
  action: z.string().trim().min(1),
});

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required');
  }
  const job = await getProductAiJob(jobId);
  if (!job) {
    throw notFoundError('Job not found', { jobId });
  }
  return NextResponse.json({ job });
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required');
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
  throw badRequestError('Invalid action');
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required');
  }
  await deleteProductAiJob(jobId);
  return NextResponse.json({ success: true });
}
