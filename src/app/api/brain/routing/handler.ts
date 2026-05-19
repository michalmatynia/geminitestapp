import { type NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  type AiBrainRoutingResponse,
  updateAiBrainRoutingRequestSchema,
} from '@/shared/contracts/ai-brain';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { internalError } from '@/shared/errors/app-error';
import {
  readBrainRoutingSettings,
  upsertBrainRoutingSettings,
} from '@/shared/lib/ai-brain/server';

export const bodySchema = updateAiBrainRoutingRequestSchema;

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const routing = await readBrainRoutingSettings();
  const payload: AiBrainRoutingResponse = {
    settings: routing.settings,
    configured: routing.configured,
    updatedAt: routing.updatedAt,
  };
  return NextResponse.json(payload);
}

export async function postHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const parsed = bodySchema.parse(ctx.body);
  const saved = await upsertBrainRoutingSettings(parsed.settings);
  if (!saved) {
    throw internalError('No AI Brain routing store configured.');
  }
  const routing = await readBrainRoutingSettings();
  const payload: AiBrainRoutingResponse = {
    settings: routing.settings,
    configured: routing.configured,
    updatedAt: routing.updatedAt,
  };
  return NextResponse.json(payload);
}
