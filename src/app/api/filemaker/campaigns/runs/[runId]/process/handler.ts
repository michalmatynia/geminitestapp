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
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignRetryableDeliveries,
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
  const [runsRaw, deliveriesRaw, attemptsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
  ]);
  const runRegistry = parseFilemakerEmailCampaignRunRegistry(runsRaw);
  const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw);
  const attemptRegistry = parseFilemakerEmailCampaignDeliveryAttemptRegistry(attemptsRaw);
  const run = runRegistry.runs.find((entry) => entry.id === runId) ?? null;
  if (!run) {
    throw notFoundError('Filemaker campaign run not found.');
  }
  const runDeliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id);
  const retrySummary =
    result.data.reason === 'retry'
      ? resolveFilemakerEmailCampaignRetryableDeliveries({
          deliveries: runDeliveries,
          attemptRegistry,
        })
      : null;
  const queuedDeliveryCount =
    runDeliveries.filter((delivery) => delivery.status === 'queued').length +
    (retrySummary?.retryableDeliveries.length ?? 0);

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
