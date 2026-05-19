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

const mapJobStatus = (jobStatus: string | null | undefined): DatabaseEngineOperationJob['status'] => {
  if (jobStatus === 'running') return 'running';
  if (jobStatus === 'completed') return 'completed';
  if (jobStatus === 'failed') return 'failed';
  if (jobStatus === 'canceled' || jobStatus === 'cancelled') return 'canceled';
  return 'queued';
};

const formatJobDate = (date: string | null | undefined): string | null => {
  if (date === undefined || date === null || date === '') return null;
  return new Date(date).toISOString();
};

const extractDbType = (payload: Record<string, unknown> | null): DatabaseEngineOperationJob['dbType'] => {
  const raw = payload?.['dbType'];
  return raw === 'mongodb' ? 'mongodb' : null;
};

const extractSource = (payload: Record<string, unknown> | null): string | null => {
  const raw = payload?.['source'];
  return typeof raw === 'string' ? raw : null;
};

const extractResultSummary = (result: Record<string, unknown> | null): string | null => {
  if (typeof result?.['message'] === 'string') return result['message'] as string;
  if (typeof result?.['warning'] === 'string') return result['warning'] as string;
  return null;
};

const toOperationJob = (job: DatabaseEngineOperationJobRecord): DatabaseEngineOperationJob => {
  const payload =
    (job.payload !== undefined && job.payload !== null) && typeof job.payload === 'object'
      ? (job.payload as Record<string, unknown>)
      : null;
  const result = (job.result !== undefined && job.result !== null) && typeof job.result === 'object' 
    ? (job.result as Record<string, unknown>) 
    : null;

  return {
    id: job.id,
    type: (job.jobType ?? 'db_backup') as DatabaseEngineOperationJob['type'],
    status: mapJobStatus(job.status),
    dbType: extractDbType(payload),
    direction: null,
    source: extractSource(payload),
    createdAt: new Date((job.createdAt !== undefined && job.createdAt !== null && job.createdAt !== '') ? job.createdAt : Date.now()).toISOString(),
    updatedAt: formatJobDate(job.updatedAt),
    startedAt: typeof job.startedAt === 'string' && job.startedAt.length > 0 ? job.startedAt : null,
    finishedAt: typeof job.finishedAt === 'string' && job.finishedAt.length > 0 ? job.finishedAt : null,
    errorMessage: job.errorMessage ?? null,
    resultSummary: extractResultSummary(result),
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
