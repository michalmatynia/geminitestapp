import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { cancelProductAiJob, getProductAiJob } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError, notFoundError } from '@/shared/errors/app-error';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';

type DatabaseEngineCancelableJob = {
  productId?: string | null | undefined;
  jobType: string;
};

const isDatabaseEngineCancelableJob = (value: unknown): value is DatabaseEngineCancelableJob => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const productId = record['productId'];
  return (
    (typeof productId === 'string' || productId === null || productId === undefined) &&
    typeof record['jobType'] === 'string'
  );
};

const isDatabaseEngineOperationJob = (job: DatabaseEngineCancelableJob): boolean =>
  job.productId === 'system' && job.jobType === 'db_backup';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
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
  if (!isDatabaseEngineCancelableJob(job) || !isDatabaseEngineOperationJob(job)) {
    throw badRequestError('Only Database Engine db_backup jobs can be cancelled.', {
      jobId,
      productId: job['productId'],
      type: job['jobType'],
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
