import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { parsePathMetas } from '@/features/ai/ai-paths/server/settings-store.parsing';
import {
  parseAiTriggerButtonsRaw,
  serializeAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';

export type StaleTriggerButtonCleanupPlan = {
  removedTriggerButtons: number;
  staleButtonIds: string[];
  stalePathIds: string[];
  nextTriggerButtonsRaw: string;
};

const normalizePathId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildStaleTriggerButtonCleanupPlan = (args: {
  triggerButtonsRaw: string | null;
  indexRaw: string | null;
  existingSettingKeys: string[];
}): StaleTriggerButtonCleanupPlan => {
  const triggerButtons = parseAiTriggerButtonsRaw(args.triggerButtonsRaw);
  const indexedPathIds = new Set(parsePathMetas(args.indexRaw).map((meta) => meta.id));
  const configuredPathIds = new Set(
    args.existingSettingKeys
      .filter((key) => key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX))
      .map((key) => key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length))
      .filter((pathId) => pathId.length > 0)
  );
  const staleButtonIds: string[] = [];
  const stalePathIds = new Set<string>();

  const nextTriggerButtons = triggerButtons
    .filter((button) => {
      const pathId = normalizePathId(button.pathId);
      if (!pathId) {
        return true;
      }
      if (indexedPathIds.has(pathId) && configuredPathIds.has(pathId)) {
        return true;
      }
      staleButtonIds.push(button.id);
      stalePathIds.add(pathId);
      return false;
    })
    .map((button, index) => (button.sortIndex === index ? button : { ...button, sortIndex: index }));

  return {
    removedTriggerButtons: triggerButtons.length - nextTriggerButtons.length,
    staleButtonIds,
    stalePathIds: Array.from(stalePathIds).sort(),
    nextTriggerButtonsRaw: serializeAiTriggerButtonsRaw(nextTriggerButtons),
  };
};

export const STALE_TRIGGER_BUTTON_CLEANUP_KEYS = {
  triggerButtons: AI_PATHS_TRIGGER_BUTTONS_KEY,
  pathIndex: AI_PATHS_INDEX_KEY,
} as const;
