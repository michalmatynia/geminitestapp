import { NextRequest, NextResponse } from 'next/server';

import {
  getAiPathsSetting,
  requireAiPathsAccess,
  upsertAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import {
  aiTriggerButtonUpdateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { AiTriggerButtonRecord } from '@/shared/types/domain/ai-trigger-buttons';

const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
const readTriggerButtonsRaw = async (): Promise<string | null> =>
  await getAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);

const writeTriggerButtonsRaw = async (value: string): Promise<void> => {
  await upsertAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
};

export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await requireAiPathsAccess();
  const id = params.id;
  if (!id) throw badRequestError('Missing trigger button id.');
  const parsed = await parseJsonBody(req, aiTriggerButtonUpdateSchema, {
    logPrefix: 'ai-paths.trigger-buttons.PATCH',
  });
  if (!parsed.ok) return parsed.response;
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const index = existing.findIndex((item: AiTriggerButtonRecord) => item.id === id);
  if (index === -1) {
    throw notFoundError('Trigger button not found.', { id });
  }
  const current = existing[index]!;
  const now = new Date().toISOString();
  const nextRecord: AiTriggerButtonRecord = {
    ...current,
    ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
    ...(parsed.data.iconId !== undefined ? { iconId: parsed.data.iconId ? parsed.data.iconId.trim() : null } : {}),
    ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
    ...(parsed.data.locations ? { locations: parsed.data.locations } : {}),
    ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
    ...(parsed.data.display ? { display: parsed.data.display } : {}),
    updatedAt: now,
  };
  const next = existing.slice();
  next[index] = nextRecord;
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(nextRecord);
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await requireAiPathsAccess();
  const id = params.id;
  if (!id) throw badRequestError('Missing trigger button id.');
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const next = existing.filter((item: AiTriggerButtonRecord) => item.id !== id);
  if (next.length === existing.length) {
    throw notFoundError('Trigger button not found.', { id });
  }
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json({ ok: true });
}
