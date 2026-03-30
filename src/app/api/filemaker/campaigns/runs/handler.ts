import { NextRequest, NextResponse } from 'next/server';

import {
  enqueueFilemakerEmailCampaignRunJob,
  startFilemakerEmailCampaignQueue,
} from '@/features/jobs/server';
import {
  launchFilemakerEmailCampaignRun,
} from '@/features/filemaker/server/campaign-runtime';
import type {
  FilemakerEmailCampaignLaunchRunRequest,
  FilemakerEmailCampaignLaunchRunResponse,
} from '@/features/filemaker/types';
import { filemakerEmailCampaignLaunchRunRequestSchema } from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const result: JsonParseResult<FilemakerEmailCampaignLaunchRunRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignLaunchRunRequestSchema,
    { logPrefix: 'filemaker.campaigns.runs.POST' }
  );
  if (!result.ok) {
    return result.response;
  }

  const launch = await launchFilemakerEmailCampaignRun(result.data);
  const response: FilemakerEmailCampaignLaunchRunResponse = {
    campaignId: launch.campaign.id,
    runId: launch.run.id,
    status: launch.run.status,
    dispatchMode: result.data.mode === 'dry_run' ? 'dry_run' : 'queued',
    queueJobId: null,
    queuedDeliveryCount: launch.queuedDeliveryCount,
  };

  if (result.data.mode === 'live' && launch.queuedDeliveryCount > 0) {
    startFilemakerEmailCampaignQueue();
    const queueResult = await enqueueFilemakerEmailCampaignRunJob({
      campaignId: launch.campaign.id,
      runId: launch.run.id,
      reason: 'launch',
    });
    response.dispatchMode = queueResult.dispatchMode;
    response.queueJobId = queueResult.jobId;
  }

  return NextResponse.json(response);
}
