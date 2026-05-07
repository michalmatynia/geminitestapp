import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProductAiJobs, getQueueStatus } from '@/features/database/server/jobs';
import type {
  DatabaseEngineOperationJob,
  DatabaseEngineOperationsJobs,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';

export const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(200)),
});

type DatabaseEngineOperationJobRecord = Awaited<ReturnType<typeof getProductAiJobs>>[number];

const isDatabaseEngineOperationJob = (job: DatabaseEngineOperationJobRecord): boolean =>
  job.jobType === 'db_backup';

const toOperationJob = (job: DatabaseEngineOperationJobRecord): DatabaseEngineOperationJob => {
  const payload =
    job.payload && typeof job.payload === 'object'
      ? (job.payload as Record<string, unknown>)
      : null;
  const result = job.result && typeof job.result === 'object' ? job.result : null;

  const rawDbType = payload?.['dbType'];
  const dbType =
    rawDbType === 'mongodb' ? (rawDbType as DatabaseEngineOperationJob['dbType']) : null;
  const direction = null;
  const source = typeof payload?.['source'] === 'string' ? payload['source'] : null;
  const resultSummary =
    typeof result?.['message'] === 'string'
      ? result['message']
      : typeof result?.['warning'] === 'string'
        ? result['warning']
        : null;

  let status: DatabaseEngineOperationJob['status'] = 'queued';
  if (job.status === 'running') status = 'running';
  if (job.status === 'completed') status = 'completed';
  if (job.status === 'failed') status = 'failed';
  if (job.status === 'canceled' || job.status === 'cancelled') status = 'canceled';

  return {
    id: job.id,
    type: (job.jobType ?? 'db_backup') as DatabaseEngineOperationJob['type'],
    status,
    dbType,
    direction,
    source,
    createdAt: new Date(job.createdAt || Date.now()).toISOString(),
    updatedAt:
      typeof job.updatedAt === 'string' && job.updatedAt.length > 0
        ? new Date(job.updatedAt).toISOString()
        : null,
    startedAt: typeof job.startedAt === 'string' && job.startedAt.length > 0 ? job.startedAt : null,
    finishedAt:
      typeof job.finishedAt === 'string' && job.finishedAt.length > 0 ? job.finishedAt : null,
    errorMessage: job.errorMessage ?? null,
    resultSummary,
    payload: payload ?? {},
    result: result ?? null,
    progress: job.progress ?? 0,
    completedAt: job.completedAt ?? null,
  };
};

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const limit = query.limit ?? 30;
  const [jobsResponse, queueStatus] = await Promise.all([
    getProductAiJobs('system'),
    getQueueStatus(),
  ]);

  const jobs = jobsResponse
    .filter(isDatabaseEngineOperationJob)
    .slice(0, limit)
    .map(toOperationJob);

  const payload: DatabaseEngineOperationsJobs = {
    timestamp: new Date().toISOString(),
    queueStatus,
    jobs,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
