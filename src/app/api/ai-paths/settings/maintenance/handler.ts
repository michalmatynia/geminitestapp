import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  AI_PATHS_MAINTENANCE_ACTION_ID_ALIASES,
  applyAiPathsSettingsMaintenance,
  inspectAiPathsSettingsMaintenance,
  type AiPathsMaintenanceRequestedActionId,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const applyMaintenancePayloadSchema = z.object({
  actionIds: z.array(z.string()).optional(),
});

const MAINTENANCE_REQUESTED_ACTION_IDS = new Set<string>([
  ...AI_PATHS_MAINTENANCE_ACTION_IDS,
  ...Object.keys(AI_PATHS_MAINTENANCE_ACTION_ID_ALIASES),
]);

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

  const actionIds = parsed.data.actionIds?.filter(
    (value: string): boolean => value.trim().length > 0 && MAINTENANCE_REQUESTED_ACTION_IDS.has(value)
  );
  const result = await applyAiPathsSettingsMaintenance(
    actionIds && actionIds.length > 0
      ? (actionIds as AiPathsMaintenanceRequestedActionId[])
      : undefined
  );
  return NextResponse.json(result);
}
