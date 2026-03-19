import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { enqueueKangurSocialPipelineJob } from '@/features/kangur/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const jobId = await enqueueKangurSocialPipelineJob();
  return NextResponse.json({ success: true, jobId }, { status: 201 });
}
