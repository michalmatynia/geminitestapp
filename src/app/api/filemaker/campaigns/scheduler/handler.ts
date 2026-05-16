import { type NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  runFilemakerEmailCampaignSchedulerTick,
  type FilemakerEmailCampaignSchedulerTickResult,
} from '@/features/filemaker/server';
import { startFilemakerEmailCampaignQueue } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();

  const result: FilemakerEmailCampaignSchedulerTickResult =
    await runFilemakerEmailCampaignSchedulerTick();

  if (result.launchedRuns.length > 0) {
    startFilemakerEmailCampaignQueue();
  }

  return NextResponse.json({
    evaluatedCampaignCount: result.evaluatedCampaignCount,
    dueCampaignCount: result.dueCampaignCount,
    launchedRunCount: result.launchedRuns.length,
    launchedRuns: result.launchedRuns,
    skippedCount: result.skippedByReason.reduce((total, entry) => total + entry.count, 0),
    skippedByReason: result.skippedByReason,
  });
}
