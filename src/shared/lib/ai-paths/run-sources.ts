export const AI_PATHS_RUN_SOURCE_VALUES = [
  'ai_paths_ui',
  'ai_paths_direct',
  'trigger_button',
  'product_panel',
] as const;

export const AI_PATHS_RUN_SOURCE_TABS = [
  'product',
  'products',
  'note',
  'notes',
  'translation',
  'translations',
] as const;

const normalizeTag = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const isAiPathsRunSourceValue = (value: unknown): boolean => {
  const normalized = normalizeTag(value);
  return normalized
    ? AI_PATHS_RUN_SOURCE_VALUES.includes(normalized as (typeof AI_PATHS_RUN_SOURCE_VALUES)[number])
    : false;
};

export const isAiPathsRunSourceTab = (value: unknown): boolean => {
  const normalized = normalizeTag(value);
  return normalized
    ? AI_PATHS_RUN_SOURCE_TABS.includes(normalized as (typeof AI_PATHS_RUN_SOURCE_TABS)[number])
    : false;
};
