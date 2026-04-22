import { type NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  cancelFilemakerEmailCampaignRun,
  type FilemakerEmailCampaignCancelRunResponse,
} from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

import { z } from 'zod';

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { runId } = paramsSchema.parse(params);
  await assertSettingsManageAccess();

  const result = await cancelFilemakerEmailCampaignRun({
    runId,
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
