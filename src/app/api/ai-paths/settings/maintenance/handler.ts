import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  applyAiPathsSettingsMaintenance,
  inspectAiPathsSettingsMaintenance,
} from '@/features/ai/ai-paths/server';
import type { AiPathsMaintenanceActionId } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEPRECATED_MAINTENANCE_ACTION_ID_ALIASES = {
  normalize_runtime_kernel_mode: 'normalize_runtime_kernel_settings',
} as const satisfies Record<string, AiPathsMaintenanceActionId>;

type DeprecatedMaintenanceActionId = keyof typeof DEPRECATED_MAINTENANCE_ACTION_ID_ALIASES;

const maintenanceActionIdSchema = z.enum(AI_PATHS_MAINTENANCE_ACTION_IDS);
const maintenanceActionIdInputSchema = z.union([
  maintenanceActionIdSchema,
  z.literal('normalize_runtime_kernel_mode'),
]);
const applyMaintenancePayloadSchema = z.object({
  actionIds: z.array(maintenanceActionIdInputSchema).optional(),
});

const normalizeMaintenanceActionIds = (
  actionIds: Array<AiPathsMaintenanceActionId | DeprecatedMaintenanceActionId> | undefined
): AiPathsMaintenanceActionId[] | undefined => {
  if (!actionIds || actionIds.length === 0) return undefined;
  const normalizedActionIds = new Set<AiPathsMaintenanceActionId>();
  actionIds.forEach((actionId) => {
    if (actionId === 'normalize_runtime_kernel_mode') {
      normalizedActionIds.add(
        DEPRECATED_MAINTENANCE_ACTION_ID_ALIASES.normalize_runtime_kernel_mode
      );
      return;
    }
    normalizedActionIds.add(actionId);
  });
  return Array.from(normalizedActionIds);
};

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
    } catch (error) {
      void ErrorSystem.captureException(error);
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = applyMaintenancePayloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid AI Paths maintenance payload.');
  }

  const actionIds = normalizeMaintenanceActionIds(parsed.data.actionIds);
  const result = await applyAiPathsSettingsMaintenance(actionIds);
  return NextResponse.json(result);
}
