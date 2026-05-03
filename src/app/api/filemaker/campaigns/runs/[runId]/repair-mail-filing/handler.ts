import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { repairFilemakerCampaignRunMailFiling } from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

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
  const result = await repairFilemakerCampaignRunMailFiling(runId);
  return NextResponse.json(result);
}
