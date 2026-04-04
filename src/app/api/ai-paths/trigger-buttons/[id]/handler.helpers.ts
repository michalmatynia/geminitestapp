import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { buildCanonicalTriggerButtonDisplay } from '@/features/ai/ai-paths/validations/trigger-buttons';

export const requireTriggerButtonId = (id: string | undefined): string => {
  if (!id) throw badRequestError('Missing trigger button id.');
  return id;
};

export const findTriggerButtonIndex = (
  records: AiTriggerButtonRecord[],
  id: string
): number => {
  const index = records.findIndex((item: AiTriggerButtonRecord) => item.id === id);
  if (index === -1) {
    throw notFoundError('Trigger button not found.', { id });
  }
  return index;
};

export const buildPatchedTriggerButtonRecord = (input: {
  current: AiTriggerButtonRecord;
  patch: {
    name?: string | undefined;
    iconId?: string | null | undefined;
    pathId?: string | null | undefined;
    enabled?: boolean | undefined;
    locations?: AiTriggerButtonRecord['locations'] | undefined;
    mode?: AiTriggerButtonRecord['mode'] | undefined;
    display?: 'icon' | 'icon_label' | undefined;
  };
  now: string;
  nextPathId: string | null;
}): AiTriggerButtonRecord => {
  const { current, patch, now, nextPathId } = input;
  const nextName = patch.name ? patch.name.trim() : current.name;
  const currentDisplayMode = current.display.showLabel === false ? 'icon' : 'icon_label';
  const nextDisplayMode = patch.display ?? currentDisplayMode;

  return {
    ...current,
    name: nextName,
    ...(patch.iconId !== undefined ? { iconId: patch.iconId ? patch.iconId.trim() : null } : {}),
    ...(patch.pathId !== undefined ? { pathId: nextPathId } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.locations ? { locations: patch.locations } : {}),
    ...(patch.mode ? { mode: patch.mode } : {}),
    display: buildCanonicalTriggerButtonDisplay(nextName, nextDisplayMode),
    updatedAt: now,
  };
};

export const normalizeRemainingTriggerButtons = (
  records: AiTriggerButtonRecord[],
  id: string
): AiTriggerButtonRecord[] => {
  const filtered = records.filter((item: AiTriggerButtonRecord) => item.id !== id);
  if (filtered.length === records.length) {
    throw notFoundError('Trigger button not found.', { id });
  }

  return filtered.map((record, index) =>
    record.sortIndex === index ? record : { ...record, sortIndex: index }
  );
};
