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

const buildSeedFallbackState = (
  seedAction: PlaywrightAction | null,
  fallbackReason: string | null
): ProductScrapeProfileRuntimeActionState | null =>
  seedAction === null
    ? null
    : { action: seedAction, fallbackReason, isSeedFallback: true };

const resolveSingleStoredActionState = (
  actions: readonly PlaywrightAction[] | null | undefined,
  seedAction: PlaywrightAction | null,
  storedAction: PlaywrightAction
): ProductScrapeProfileRuntimeActionState | null => {
  const normalizedAction = normalizePlaywrightAction(storedAction);
  const analysis = analyzeLoadedPlaywrightActions([...(actions ?? [])]);
  const error = analysis.runtimeActionErrorsById[normalizedAction.id] ?? null;
  if (error === null) {
    return { action: normalizedAction, fallbackReason: null, isSeedFallback: false };
  }
  return buildSeedFallbackState(seedAction, error);
};

const resolveProductScrapeProfileActionState = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionState | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  if (runtimeKey === null) return null;
  const storedActions = [...(actions ?? [])].filter((action) => action.runtimeKey === runtimeKey);
  const seedAction = getPlaywrightRuntimeActionSeed(runtimeKey);

  if (storedActions.length === 1) {
    const storedAction = storedActions[0];
    return storedAction === undefined
      ? buildSeedFallbackState(seedAction, null)
      : resolveSingleStoredActionState(actions, seedAction, storedAction);
  }

  const fallbackReason =
    storedActions.length > 1 ? `Multiple runtime actions were found for "${runtimeKey}".` : null;
  return buildSeedFallbackState(seedAction, fallbackReason);
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

const applyRuntimeActionHeadless = (
  action: PlaywrightAction,
  headless: boolean,
  updatedAt: string
): PlaywrightAction =>
  normalizePlaywrightAction({
    ...action,
    executionSettings: {
      ...defaultPlaywrightActionExecutionSettings,
      ...action.executionSettings,
      headless,
    },
    updatedAt,
  });

const replaceRuntimeAction = (
  actions: PlaywrightAction[],
  runtimeKey: ActionSequenceKey,
  replacement: PlaywrightAction
): PlaywrightAction[] => {
  const insertIndex = actions.findIndex((action) => action.runtimeKey === runtimeKey);
  const retainedActions = actions.filter((action) => action.runtimeKey !== runtimeKey);
  const nextActions = [...retainedActions];
  nextActions.splice(insertIndex === -1 ? nextActions.length : insertIndex, 0, replacement);
  return nextActions;
};

export const resolveProductScrapeProfileActionConnection = (
  actions: readonly PlaywrightAction[] | null | undefined,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionConnection | null => {
  const runtimeKey = resolveProductScrapeProfileRuntimeKey(runtimeActionKey);
  const actionState = resolveProductScrapeProfileActionState(actions, runtimeActionKey);
  if (runtimeKey === null || actionState?.action.runtimeKey !== runtimeKey) {
    return null;
  }
  const action = actionState.action;
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
  const actionState = resolveProductScrapeProfileActionState(actions, runtimeKey);
  if (actionState === null) return mergeSeededPlaywrightActions([...actions]);
  return replaceRuntimeAction(
    mergeSeededPlaywrightActions([...actions]),
    runtimeKey,
    applyRuntimeActionHeadless(actionState.action, headless, updatedAt)
  );
};
