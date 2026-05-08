'use client';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { toActionSequenceKey } from '@/shared/lib/browser-execution/runtime-action-keys';

const DEFAULT_PRODUCT_SCRAPE_HEADLESS = true;

export type ProductScrapeProfileRuntimeActionConnection = {
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  description: string | null;
  enabledStepCount: number;
  id: string;
  isSeedFallback: boolean;
  name: string;
  runtimeKey: ActionSequenceKey;
  totalStepCount: number;
  updatedAt: string;
};

const resolveProductScrapeProfileRuntimeKey = (
  runtimeActionKey: string | null | undefined
): ActionSequenceKey | null => toActionSequenceKey(runtimeActionKey);

const resolveProductScrapeProfileAction = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): PlaywrightAction | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  if (runtimeKey === null) return null;
  const mergedActions = mergeSeededPlaywrightActions([...(actions ?? [])]);
  return (
    mergedActions.find((action) => action.runtimeKey === runtimeKey) ??
    getPlaywrightRuntimeActionSeed(runtimeKey)
  );
};

export const resolveProductScrapeProfileHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): boolean =>
  resolveProductScrapeProfileAction(actions, runtimeActionKey)?.executionSettings.headless ??
  DEFAULT_PRODUCT_SCRAPE_HEADLESS;

const formatBrowserModeLabel = (
  headless: boolean | null
): ProductScrapeProfileRuntimeActionConnection['browserModeLabel'] => {
  if (headless === null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

export const resolveProductScrapeProfileActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionConnection | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  const action = resolveProductScrapeProfileAction(actions, runtimeActionKey);
  if (runtimeKey === null || action?.runtimeKey !== runtimeKey) {
    return null;
  }
  const hasStoredAction =
    actions?.some((entry) => entry.runtimeKey === runtimeKey) ?? false;
  const enabledStepCount = action.blocks.filter((block) => block.enabled !== false).length;

  return {
    browserModeLabel: formatBrowserModeLabel(action.executionSettings.headless),
    description: action.description,
    enabledStepCount,
    id: action.id,
    isSeedFallback: !hasStoredAction,
    name: action.name,
    runtimeKey,
    totalStepCount: action.blocks.length,
    updatedAt: action.updatedAt,
  };
};

export const updateProductScrapeProfileHeadlessAction = ({
  actions,
  headless,
  runtimeActionKey,
  updatedAt = new Date().toISOString(),
}: {
  actions: readonly PlaywrightAction[];
  headless: boolean;
  runtimeActionKey: string | null | undefined;
  updatedAt?: string;
}): PlaywrightAction[] => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  if (runtimeKey === null) return mergeSeededPlaywrightActions([...actions]);
  return mergeSeededPlaywrightActions([...actions]).map((action) =>
    action.runtimeKey === runtimeKey
      ? normalizePlaywrightAction({
          ...action,
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            ...action.executionSettings,
            headless,
          },
          updatedAt,
        })
      : action
  );
};
