import { NextRequest, NextResponse } from 'next/server';

import { getCaseResolverOcrJobById } from '@/features/case-resolver/server/ocr-runtime-job-store';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(
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

