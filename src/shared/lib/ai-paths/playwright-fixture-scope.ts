import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

export const PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME =
  'ai-paths-playwright-trigger-buttons';
export const PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM = 'includeFixtureButtons';
export const PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX = 'path_pw_products_';
export const PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX = 'PW-AIP-';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const shouldIncludePlaywrightAiPathsFixtureButtons = (
  value: string | null | undefined
): boolean => {
  if (typeof value !== 'string') return false;
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
};

export const isPlaywrightAiPathsFixturePathId = (
  pathId: string | null | undefined
): boolean => {
  if (typeof pathId !== 'string') return false;
  return pathId.trim().startsWith(PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX);
};

export const isPlaywrightAiPathsFixtureTriggerButton = (
  button: Pick<AiTriggerButtonRecord, 'pathId'>
): boolean => isPlaywrightAiPathsFixturePathId(button.pathId);
