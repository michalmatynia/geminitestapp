export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import {
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
  async () => {
    const health = await getMilkbarPushQueueHealth();
    return NextResponse.json({ ok: true, health });
  },
  {
    source: 'v2.page-manager.milkbardesigners.push-to-cloud.GET',
    requireAuth: true,
  }
);
