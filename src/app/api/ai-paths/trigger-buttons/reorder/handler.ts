import { NextRequest, NextResponse } from 'next/server';

import {
  getAiPathsSetting,
  requireAiPathsAccess,
  upsertAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import {
  aiTriggerButtonReorderSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
const readTriggerButtonsRaw = async (): Promise<string | null> =>
  await getAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);

const writeTriggerButtonsRaw = async (value: string): Promise<void> => {
  await upsertAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
};

const applyReorder = (
  existing: AiTriggerButtonRecord[],
  orderedIds: string[],
): AiTriggerButtonRecord[] => {
  const byId = new Map<string, AiTriggerButtonRecord>();
  existing.forEach((item: AiTriggerButtonRecord) => byId.set(item.id, item));

  const seen = new Set<string>();
  const next: AiTriggerButtonRecord[] = [];

  orderedIds.forEach((id: string) => {
    const normalized = id.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    const record = byId.get(normalized);
    if (!record) return;
    seen.add(normalized);
    next.push(record);
  });

  // Preserve existing relative order for any ids not present in the payload.
  existing.forEach((item: AiTriggerButtonRecord) => {
    if (seen.has(item.id)) return;
    next.push(item);
  });

  return next;
};

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  await requireAiPathsAccess();
  const parsed = await parseJsonBody(req, aiTriggerButtonReorderSchema, {
    logPrefix: 'ai-paths.trigger-buttons.reorder.POST',
  });
  if (!parsed.ok) return parsed.response;

  const orderedIds = parsed.data.orderedIds ?? [];
  if (!Array.isArray(orderedIds)) {
    throw badRequestError('orderedIds must be an array.');
  }

  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const next = applyReorder(existing, orderedIds);
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(next);
}
