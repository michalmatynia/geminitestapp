export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';

import {
  getJobProgress,
  getMilkbarPushQueueHealth,
  triggerMilkbarPushToCloud,
} from '@/features/page-manager/milkbardesigners/milkbar-push-to-cloud-queue';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(
  async () => {
    const outcome = await triggerMilkbarPushToCloud();
    const status = outcome.ok ? (outcome.mode === 'queue' ? 201 : 200) : 502;
    return NextResponse.json(outcome, { status });
  },
  {
    source: 'v2.page-manager.milkbardesigners.push-to-cloud.POST',
    requireAuth: true,
  }
);

export const GET = apiHandler(
  async (req: NextRequest) => {
    const jobId = new URL(req.url).searchParams.get('jobId');
    if (jobId !== null && jobId.trim().length > 0) {
      const jobStatus = await getJobProgress(jobId.trim());
      return NextResponse.json({ ok: true, jobStatus });
    }
    const health = await getMilkbarPushQueueHealth();
    return NextResponse.json({ ok: true, health });
  },
  {
    source: 'v2.page-manager.milkbardesigners.push-to-cloud.GET',
    requireAuth: true,
  }
);
