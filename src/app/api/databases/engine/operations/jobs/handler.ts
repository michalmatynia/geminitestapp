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
  (job as any)['jobType'] === 'db_backup' || (job as any)['jobType'] === 'db_sync';

const toOperationJob = (job: DatabaseEngineOperationJobRecord): DatabaseEngineOperationJobDto => {
  const payload =
    (job as any)['payload'] && typeof (job as any)['payload'] === 'object'
      ? ((job as any)['payload'] as Record<string, unknown>)
      : null;
  const result =
    (job as any)['result'] && typeof (job as any)['result'] === 'object'
      ? ((job as any)['result'] as Record<string, unknown>)
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

  return {
    id: (job as any)['id'],
    type: (job as any)['jobType'] as DatabaseEngineOperationJobDto['type'],
    status: (job as any)['status'] as DatabaseEngineOperationJobDto['status'],
    dbType,
    direction,
    source,
    createdAt: new Date(((job as any)['createdAt'] as string) || Date.now()).toISOString(),
    updatedAt:
      typeof (job as any)['updatedAt'] === 'string' && ((job as any)['updatedAt']).length > 0
        ? new Date((job as any)['updatedAt']).toISOString()
        : null,
    startedAt:
      typeof (job as any)['startedAt'] === 'string' && ((job as any)['startedAt']).length > 0
        ? ((job as any)['startedAt'])
        : null,
    finishedAt:
      typeof (job as any)['finishedAt'] === 'string' && ((job as any)['finishedAt']).length > 0
        ? ((job as any)['finishedAt'])
        : null,
    errorMessage: ((job as any)['errorMessage'] as string) ?? null,
    resultSummary,
    payload: payload ?? {},
    result: result ?? null,
    progress: (job as any)['progress'] ?? 0,
    completedAt: (job as any)['completedAt'] ?? null,
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
