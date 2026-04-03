import { NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  cancelFilemakerEmailCampaignRun,
  type FilemakerEmailCampaignCancelRunResponse,
} from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  await assertSettingsManageAccess();

  const result = await cancelFilemakerEmailCampaignRun({
    runId: params.runId,
    actor: 'admin',
    message: 'Run cancelled from the Filemaker campaign admin.',
  });

  const response: FilemakerEmailCampaignCancelRunResponse = {
    campaignId: result.campaign.id,
    runId: result.run.id,
    status: result.run.status,
  };

  return NextResponse.json(response);
}
