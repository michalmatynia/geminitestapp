import { NextRequest, NextResponse } from 'next/server';

import {
  getAiPathsSetting,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
  upsertAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import {
  aiTriggerButtonCreateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
const readTriggerButtonsRaw = async (): Promise<string | null> =>
  await getAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);

const writeTriggerButtonsRaw = async (value: string): Promise<void> => {
  await upsertAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsRunAccess();
  } catch (error) {
    // Trigger buttons are rendered across multiple surfaces. For users without
    // AI-paths permissions, treat this as an empty list rather than a noisy API error.
    if (
      isAppError(error) &&
      (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
    ) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }
    throw error;
  }
  const raw = await readTriggerButtonsRaw();
  const triggerButtons = parseAiTriggerButtonsRaw(raw);
  return NextResponse.json(triggerButtons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  const parsed = await parseJsonBody(req, aiTriggerButtonCreateSchema, {
    logPrefix: 'ai-paths.trigger-buttons.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { name, iconId, enabled, locations, mode, display } = parsed.data;
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Name is required.');
  }

  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `trigger_${Math.random().toString(36).slice(2, 10)}`;

  const record = {
    id,
    name: normalizedName,
    icon: iconId ? iconId.trim() : null,
    iconId: iconId ? iconId.trim() : null,
    enabled: enabled ?? true,
    locations,
    mode,
    display,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...existing, record];
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(record);
}
