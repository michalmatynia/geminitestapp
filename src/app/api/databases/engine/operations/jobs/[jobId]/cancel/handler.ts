import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import { cancelProductAiJob, getProductAiJob } from '@/features/jobs/server';
import { authError, badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

type DatabaseEngineCancelableJob = {
  productId?: string | null | undefined;
  type: string;
};

const isDatabaseEngineOperationJob = (job: DatabaseEngineCancelableJob): boolean =>
  job.productId === 'system' && (job.type === 'db_backup' || job.type === 'db_sync');

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  await assertDatabaseEngineOperationEnabled('allowOperationJobCancellation');

  const { jobId } = params;
  if (!jobId) {
    throw badRequestError('Job id is required.');
  }

  const job = await getProductAiJob(jobId);
  if (!job) {
    throw notFoundError('Job not found.', { jobId });
  }
  if (!isDatabaseEngineOperationJob(job as unknown as DatabaseEngineCancelableJob)) {
    throw badRequestError('Only Database Engine db_backup/db_sync jobs can be cancelled.', {
      jobId,
      productId: job['productId'],
      type: job['type'],
    });
  }

  const cancelled = await cancelProductAiJob(jobId);

  return NextResponse.json(
    {
      success: true,
      job: cancelled,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
