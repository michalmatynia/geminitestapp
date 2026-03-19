import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Job, Queue } from 'bullmq';

import { getKangurSocialPipelineQueue } from '@/features/kangur/workers/kangurSocialPipelineQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

type PipelineJobRecord = {
  id: string;
  status: string;
  data: unknown;
  result: unknown;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  timestamp: number;
  duration: number | null;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const managed = getKangurSocialPipelineQueue();
  const rawQueue = managed.getQueue() as Queue | null;

  if (!rawQueue) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }

  const jobs: Job[] = await rawQueue.getJobs(
    ['completed', 'failed', 'active', 'waiting'],
    0,
    49
  );

  const records: PipelineJobRecord[] = await Promise.all(
    jobs.map(async (job) => {
      const status = await job.getState();
      const processedOn = job.processedOn ?? null;
      const finishedOn = job.finishedOn ?? null;
      return {
        id: job.id ?? 'unknown',
        status,
        data: job.data,
        result: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
        processedOn,
        finishedOn,
        timestamp: job.timestamp,
        duration:
          processedOn != null && finishedOn != null
            ? finishedOn - processedOn
            : null,
      };
    })
  );

  records.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json(records, { headers: { 'Cache-Control': 'no-store' } });
}
