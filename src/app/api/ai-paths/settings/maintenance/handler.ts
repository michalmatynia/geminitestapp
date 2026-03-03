import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  applyAiPathsSettingsMaintenance,
  inspectAiPathsSettingsMaintenance,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const maintenanceActionIdSchema = z.enum(AI_PATHS_MAINTENANCE_ACTION_IDS);
const applyMaintenancePayloadSchema = z.object({
  actionIds: z.array(maintenanceActionIdSchema).optional(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const report = await inspectAiPathsSettingsMaintenance();
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = applyMaintenancePayloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid AI Paths maintenance payload.');
  }

  const actionIds = parsed.data.actionIds;
  const result = await applyAiPathsSettingsMaintenance(actionIds?.length ? actionIds : undefined);
  return NextResponse.json(result);
}
