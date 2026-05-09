/**
 * @file playwright-fixture-scope.ts
 * @description Provides utilities for identifying and scoping AI Paths
 * that are part of Playwright test fixtures. This helps separate test-specific
 * triggers from production ones.
 */

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

/** Cookie name used to toggle Playwright-specific trigger buttons. */
export const PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME =
  'ai-paths-playwright-trigger-buttons';
/** Query parameter used to toggle Playwright-specific trigger buttons. */
export const PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM = 'includeFixtureButtons';
/** Prefix for AI Path IDs that belong to Playwright fixtures. */
export const PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX = 'path_pw_products_';
/** Prefix for product SKUs used in Playwright AI Path tests. */
export const PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX = 'PW-AIP-';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Determines if the given value indicates that Playwright fixture buttons should be included.
 * @param value The string value to check.
 * @returns True if truthy, false otherwise.
 */
export const shouldIncludePlaywrightAiPathsFixtureButtons = (
  value: string | null | undefined
): boolean => {
  if (typeof value !== 'string') return false;
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
};

/**
 * Checks if a path ID belongs to a Playwright fixture.
 * @param pathId The path ID to check.
 * @returns True if it is a fixture path, false otherwise.
 */
export const isPlaywrightAiPathsFixturePathId = (
  pathId: string | null | undefined
): boolean => {
  if (typeof pathId !== 'string') return false;
  return pathId.trim().startsWith(PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX);
};

/**
 * Checks if a trigger button belongs to a Playwright fixture based on its path ID.
 * @param button The trigger button record.
 * @returns True if it is a fixture button, false otherwise.
 */
export const isPlaywrightAiPathsFixtureTriggerButton = (
  button: Pick<AiTriggerButtonRecord, 'pathId'>
): boolean => isPlaywrightAiPathsFixturePathId(button.pathId);
