import type { PathConfig } from '@/shared/contracts/ai-paths';

import { triggers } from '../constants/segments/rendering';

export const LEGACY_AI_PATH_TRIGGER_LABEL = 'Product Modal - Context Grabber';
export const CANONICAL_AI_PATH_TRIGGER_LABEL = 'Product Modal - Context Filter';

const AI_PATH_TRIGGER_LABEL_RENAMES = new Map<string, string>([
  [LEGACY_AI_PATH_TRIGGER_LABEL, CANONICAL_AI_PATH_TRIGGER_LABEL],
]);

export const migrateAiPathTriggerLabel = (
  value: unknown
): {
  value: string | null;
  changed: boolean;
} => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0) {
    return { value: null, changed: false };
  }

  const migrated = AI_PATH_TRIGGER_LABEL_RENAMES.get(normalized) ?? normalized;
  return {
    value: migrated,
    changed: migrated !== normalized,
  };
};

export const normalizeAiPathTriggerLabel = (value?: string | null): string =>
  migrateAiPathTriggerLabel(value).value ?? triggers[0] ?? CANONICAL_AI_PATH_TRIGGER_LABEL;

export const migrateAiPathConfigTriggerLabel = (
  config: PathConfig
): {
  config: PathConfig;
  changed: boolean;
} => {
  const migrated = migrateAiPathTriggerLabel(config.trigger);
  if (!migrated.changed || !migrated.value) {
    return { config, changed: false };
  }

  return {
    config: {
      ...config,
      trigger: migrated.value,
    },
    changed: true,
  };
};
