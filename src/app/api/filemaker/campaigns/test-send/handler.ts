import { NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  sendFilemakerEmailCampaignTest,
  type FilemakerEmailCampaignTestSendRequest,
  type FilemakerEmailCampaignTestSendResponse,
} from '@/features/filemaker/server';
import { filemakerEmailCampaignTestSendRequestSchema } from '@/shared/contracts/filemaker';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const result: JsonParseResult<FilemakerEmailCampaignTestSendRequest> = await parseJsonBody(
    req,
    filemakerEmailCampaignTestSendRequestSchema,
    { logPrefix: 'filemaker.campaigns.test-send.POST' }
  );
  if (!result.ok) {
    return result.response;
  }

  const response: FilemakerEmailCampaignTestSendResponse =
    await sendFilemakerEmailCampaignTest(result.data);
  return NextResponse.json(response, { status: 201 });
}
