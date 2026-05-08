'use client';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import { analyzeLoadedPlaywrightActions } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { toActionSequenceKey } from '@/shared/lib/browser-execution/runtime-action-keys';
import { STEP_REGISTRY } from '@/shared/lib/browser-execution/step-registry';

const DEFAULT_PRODUCT_SCRAPE_HEADLESS = true;

export type ProductScrapeProfileRuntimeStepConnection = {
  enabled: boolean;
  id: string;
  label: string;
};

export type ProductScrapeProfileRuntimeActionConnection = {
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  description: string | null;
  enabledStepCount: number;
  fallbackReason: string | null;
  id: string;
  isSeedFallback: boolean;
  name: string;
  runtimeKey: ActionSequenceKey;
  steps: ProductScrapeProfileRuntimeStepConnection[];
  totalStepCount: number;
  updatedAt: string;
};

type ProductScrapeProfileRuntimeActionState = {
  action: PlaywrightAction;
  fallbackReason: string | null;
  isSeedFallback: boolean;
};

const resolveProductScrapeProfileRuntimeKey = (
  runtimeActionKey: string | null | undefined
): ActionSequenceKey | null => toActionSequenceKey(runtimeActionKey);

const resolveProductScrapeProfileActionState = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionState | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  if (runtimeKey === null) return null;
  const storedActions = [...(actions ?? [])].filter((action) => action.runtimeKey === runtimeKey);
  const seedAction = getPlaywrightRuntimeActionSeed(runtimeKey);

  if (storedActions.length === 1) {
    const storedAction = normalizePlaywrightAction(storedActions[0] as PlaywrightAction);
    const analysis = analyzeLoadedPlaywrightActions([...(actions ?? [])]);
    const error = analysis.runtimeActionErrorsById[storedAction.id] ?? null;
    if (error === null) {
      return { action: storedAction, fallbackReason: null, isSeedFallback: false };
    }
    if (seedAction === null) return null;
    return { action: seedAction, fallbackReason: error, isSeedFallback: true };
  }

  if (seedAction === null) return null;
  return {
    action: seedAction,
    fallbackReason:
      storedActions.length > 1 ? `Multiple runtime actions were found for "${runtimeKey}".` : null,
    isSeedFallback: true,
  };
};

export const resolveProductScrapeProfileHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): boolean =>
  resolveProductScrapeProfileActionState(actions, runtimeActionKey)?.action.executionSettings
    .headless ??
  DEFAULT_PRODUCT_SCRAPE_HEADLESS;

const formatBrowserModeLabel = (
  headless: boolean | null
): ProductScrapeProfileRuntimeActionConnection['browserModeLabel'] => {
  if (headless === null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

const resolveRuntimeStepLabel = (refId: string): string =>
  refId in STEP_REGISTRY ? STEP_REGISTRY[refId as keyof typeof STEP_REGISTRY].label : refId;

const buildRuntimeStepConnections = (
  action: PlaywrightAction
): ProductScrapeProfileRuntimeStepConnection[] =>
  action.blocks
    .filter((block) => block.kind === 'runtime_step')
    .map((block) => ({
      enabled: block.enabled !== false,
      id: block.refId,
      label: resolveRuntimeStepLabel(block.refId),
    }));

export const resolveProductScrapeProfileActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionConnection | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  const actionState = resolveProductScrapeProfileActionState(actions, runtimeActionKey);
  const action = actionState?.action ?? null;
  if (runtimeKey === null || action === null || action.runtimeKey !== runtimeKey) {
    return null;
  }
  const enabledStepCount = action.blocks.filter((block) => block.enabled !== false).length;

  return {
    browserModeLabel: formatBrowserModeLabel(action.executionSettings.headless),
    description: action.description,
    enabledStepCount,
    fallbackReason: actionState.fallbackReason,
    id: action.id,
    isSeedFallback: actionState.isSeedFallback,
    name: action.name,
    runtimeKey,
    steps: buildRuntimeStepConnections(action),
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
