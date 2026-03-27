import { NextRequest, NextResponse } from 'next/server';

import {
  enqueueFilemakerEmailCampaignRunJob,
  startFilemakerEmailCampaignQueue,
} from '@/features/jobs/server';
import type {
  FilemakerEmailCampaignProcessRunRequest,
  FilemakerEmailCampaignProcessRunResponse,
} from '@/features/filemaker/types';
import {
  filemakerEmailCampaignProcessRunRequestSchema,
} from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { assertSettingsManageAccess } from '@/shared/lib/auth/settings-manage-access';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRunRegistry,
} from '@/features/filemaker/settings';
import { readFilemakerCampaignSettingValue } from '@/features/filemaker/server/campaign-settings-store';

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  await assertSettingsManageAccess();
  const result: JsonParseResult<FilemakerEmailCampaignProcessRunRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignProcessRunRequestSchema,
    {
      logPrefix: 'filemaker.campaigns.runs.[runId].process.POST',
      allowEmpty: true,
    }
  );
  if (!result.ok) {
    return result.response;
  }

  const runId = params.runId;
  const [runsRaw, deliveriesRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
  ]);
  const runRegistry = parseFilemakerEmailCampaignRunRegistry(runsRaw);
  const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw);
  const run = runRegistry.runs.find((entry) => entry.id === runId) ?? null;
  if (!run) {
    throw notFoundError('Filemaker campaign run not found.');
  }
  const queuedDeliveryCount = getFilemakerEmailCampaignDeliveriesForRun(
    deliveryRegistry,
    run.id
  ).filter((delivery) => delivery.status === 'queued').length;

  startFilemakerEmailCampaignQueue();
  const queueResult = await enqueueFilemakerEmailCampaignRunJob({
    campaignId: run.campaignId,
    runId: run.id,
    reason: result.data.reason,
  });

  const response: FilemakerEmailCampaignProcessRunResponse = {
    campaignId: run.campaignId,
    runId: run.id,
    status: run.status,
    dispatchMode: queueResult.dispatchMode,
    queueJobId: queueResult.jobId,
    queuedDeliveryCount,
  };

  return NextResponse.json(response);
}
