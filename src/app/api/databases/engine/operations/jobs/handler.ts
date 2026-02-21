import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getProductAiJobs, getQueueStatus } from '@/features/jobs/server';
import type {
  DatabaseEngineOperationJobDto,
  DatabaseEngineOperationsJobsDto,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(200, Math.max(1, parsed));
};

type DatabaseEngineOperationJobRecord = Awaited<ReturnType<typeof getProductAiJobs>>[number];

const isDatabaseEngineOperationJob = (job: DatabaseEngineOperationJobRecord): boolean =>
  job.jobType === 'db_backup' || job.jobType === 'db_sync';

const toOperationJob = (job: DatabaseEngineOperationJobRecord): DatabaseEngineOperationJobDto => {
  const payload =
    job.payload && typeof job.payload === 'object'
      ? (job.payload as Record<string, unknown>)
      : null;
  const result =
    job.result && typeof job.result === 'object'
      ? (job.result)
      : null;

  const rawDbType = payload?.['dbType'];
  const dbType =
    rawDbType === 'mongodb' || rawDbType === 'postgresql' ? (rawDbType as DatabaseEngineOperationJobDto['dbType']) : null;
  const rawDirection = payload?.['direction'];
  const direction =
    rawDirection === 'mongo_to_prisma' || rawDirection === 'prisma_to_mongo'
      ? (rawDirection as DatabaseEngineOperationJobDto['direction'])
      : null;
  const source = typeof payload?.['source'] === 'string' ? payload['source'] : null;
  const resultSummary =
    typeof result?.['message'] === 'string'
      ? result['message']
      : typeof result?.['warning'] === 'string'
        ? result['warning']
        : null;

  let status: DatabaseEngineOperationJobDto['status'] = 'queued';
  if (job.status === 'running') status = 'running';
  if (job.status === 'completed') status = 'completed';
  if (job.status === 'failed') status = 'failed';
  if (job.status === 'canceled' || job.status === 'cancelled') status = 'canceled';

  return {
    id: job.id,
    type: (job.jobType ?? 'db_backup') as DatabaseEngineOperationJobDto['type'],
    status,
    dbType,
    direction,
    source,
    createdAt: new Date(job.createdAt || Date.now()).toISOString(),
    updatedAt:
      typeof job.updatedAt === 'string' && job.updatedAt.length > 0
        ? new Date(job.updatedAt).toISOString()
        : null,
    startedAt:
      typeof job.startedAt === 'string' && job.startedAt.length > 0
        ? job.startedAt
        : null,
    finishedAt:
      typeof job.finishedAt === 'string' && job.finishedAt.length > 0
        ? job.finishedAt
        : null,
    errorMessage: job.errorMessage ?? null,
    resultSummary,
    payload: payload ?? {},
    result: result ?? null,
    progress: job.progress ?? 0,
    completedAt: job.completedAt ?? null,
  };
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }

  const { searchParams } = new URL(req.url);
  const limit = parseLimit(searchParams.get('limit'));
  const [jobsResponse, queueStatus] = await Promise.all([
    getProductAiJobs('system'),
    getQueueStatus(),
  ]);

  const jobs = jobsResponse
    .filter(isDatabaseEngineOperationJob)
    .slice(0, limit)
    .map(toOperationJob);

  const payload: DatabaseEngineOperationsJobsDto = {
    timestamp: new Date().toISOString(),
    queueStatus,
    jobs,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
