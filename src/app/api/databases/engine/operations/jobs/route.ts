export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getProductAiJobs, getQueueStatus } from '@/features/jobs/server';
import type {
  DatabaseEngineOperationJobDto,
  DatabaseEngineOperationsJobsDto,
} from '@/shared/dtos/database';
import { authError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(200, Math.max(1, parsed));
};

type DatabaseEngineOperationJobRecord = Awaited<ReturnType<typeof getProductAiJobs>>[number];

const isDatabaseEngineOperationJob = (job: DatabaseEngineOperationJobRecord): boolean =>
  job.type === 'db_backup' || job.type === 'db_sync';

const toOperationJob = (job: DatabaseEngineOperationJobRecord): DatabaseEngineOperationJobDto => {
  const payload =
    job.payload && typeof job.payload === 'object'
      ? (job.payload as Record<string, unknown>)
      : null;
  const result =
    job.result && typeof job.result === 'object'
      ? (job.result as Record<string, unknown>)
      : null;

  const rawDbType = payload?.['dbType'];
  const dbType =
    rawDbType === 'mongodb' || rawDbType === 'postgresql' ? rawDbType : null;
  const rawDirection = payload?.['direction'];
  const direction =
    rawDirection === 'mongo_to_prisma' || rawDirection === 'prisma_to_mongo'
      ? rawDirection
      : null;
  const source = typeof payload?.['source'] === 'string' ? payload['source'] : null;
  const resultSummary =
    typeof result?.['message'] === 'string'
      ? result['message']
      : typeof result?.['warning'] === 'string'
        ? result['warning']
        : null;

  return {
    id: job.id,
    type: job.type as DatabaseEngineOperationJobDto['type'],
    status: job.status as DatabaseEngineOperationJobDto['status'],
    dbType,
    direction,
    source,
    createdAt: new Date(job.createdAt).toISOString(),
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
  };
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

export const GET = apiHandler(GET_handler, {
  source: 'databases.engine.operations.jobs.GET',
});
