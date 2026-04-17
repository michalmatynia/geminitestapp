import type {
  PlaywrightAction,
  PlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';
import {
  hasPlaywrightActionBlockConfigOverrides,
  normalizePlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';
import { type ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import { analyzeLoadedPlaywrightActions } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

import { formatPlaywrightActionExecutionSettingsSummary } from './playwright-action-execution-settings';

const PREPARATION_STEP_ID = 'browser_preparation';

export type ManagedPlaywrightActionSummary = {
  action: PlaywrightAction;
  browserPreparationConfig: PlaywrightActionBlockConfig | null;
  browserPreparationSummary: string[];
  executionSettingsSummary: string[];
  fallbackActive: boolean;
  fallbackReason: string | null;
  runtimeKey: ActionSequenceKey;
};

const formatViewportSummary = (config: PlaywrightActionBlockConfig): string | null => {
  if (
    typeof config.viewportWidth !== 'number' ||
    typeof config.viewportHeight !== 'number'
  ) {
    return null;
  }

  return `Viewport: ${config.viewportWidth}x${config.viewportHeight}`;
};

const formatGeolocationSummary = (
  config: PlaywrightActionBlockConfig
): string | null => {
  if (
    typeof config.geolocationLatitude !== 'number' ||
    typeof config.geolocationLongitude !== 'number'
  ) {
    return null;
  }

  return `Geolocation: ${config.geolocationLatitude}, ${config.geolocationLongitude}`;
};

const formatPermissionsSummary = (
  config: PlaywrightActionBlockConfig
): string | null =>
  config.permissions.length > 0
    ? `Permissions: ${config.permissions.join(', ')}`
    : null;

const formatBrowserPreparationSummary = (
  config: PlaywrightActionBlockConfig | null
): string[] => {
  if (config === null) {
    return [];
  }

  const summary = [
    formatViewportSummary(config),
    typeof config.settleDelayMs === 'number' ? `Settle delay: ${config.settleDelayMs}ms` : null,
    config.locale === null ? null : `Locale override: ${config.locale}`,
    config.timezoneId === null ? null : `Timezone override: ${config.timezoneId}`,
    config.userAgent === null ? null : 'User agent override',
    config.colorScheme === null ? null : `Color scheme: ${config.colorScheme}`,
    config.reducedMotion === null ? null : `Reduced motion: ${config.reducedMotion}`,
    formatGeolocationSummary(config),
    formatPermissionsSummary(config),
  ];

  return summary.filter((entry): entry is string => typeof entry === 'string');
};

const resolveBrowserPreparationConfig = (
  action: PlaywrightAction
): PlaywrightActionBlockConfig | null => {
  const preparationBlock = action.blocks.find(
    (block) =>
      block.enabled &&
      block.kind === 'runtime_step' &&
      block.refId === PREPARATION_STEP_ID &&
      hasPlaywrightActionBlockConfigOverrides(block.config)
  );

  if (preparationBlock === undefined) {
    return null;
  }

  return normalizePlaywrightActionBlockConfig(preparationBlock.config);
};

const buildManagedPlaywrightActionSummary = ({
  action,
  runtimeKey,
  fallbackActive,
  fallbackReason,
}: {
  action: PlaywrightAction;
  runtimeKey: ActionSequenceKey;
  fallbackActive: boolean;
  fallbackReason: string | null;
}): ManagedPlaywrightActionSummary => {
  const browserPreparationConfig = resolveBrowserPreparationConfig(action);

  return {
    action,
    runtimeKey,
    executionSettingsSummary: formatPlaywrightActionExecutionSettingsSummary(
      action.executionSettings
    ),
    browserPreparationConfig,
    browserPreparationSummary: formatBrowserPreparationSummary(browserPreparationConfig),
    fallbackActive,
    fallbackReason,
  };
};

const resolveStoredRuntimeActionSummary = ({
  actions,
  runtimeKey,
}: {
  actions: PlaywrightAction[];
  runtimeKey: ActionSequenceKey;
}): ManagedPlaywrightActionSummary | null => {
  const groupedActions = actions.filter((action) => action.runtimeKey === runtimeKey);
  const analysis = analyzeLoadedPlaywrightActions(actions);
  const invalidAction = groupedActions.find(
    (action) => typeof analysis.runtimeActionErrorsById[action.id] === 'string'
  );

  if (groupedActions.length === 1 && invalidAction === undefined) {
    const stored = groupedActions[0];
    if (stored !== undefined) {
      return buildManagedPlaywrightActionSummary({
        action: stored,
        runtimeKey,
        fallbackActive: false,
        fallbackReason: null,
      });
    }
  }

  const seed = getPlaywrightRuntimeActionSeed(runtimeKey);
  if (seed === null) {
    return null;
  }

  return buildManagedPlaywrightActionSummary({
    action: seed,
    runtimeKey,
    fallbackActive: groupedActions.length > 0,
    fallbackReason: (() => {
      if (invalidAction !== undefined) {
        return analysis.runtimeActionErrorsById[invalidAction.id] ?? null;
      }

      if (groupedActions.length > 1) {
        return `Multiple stored runtime actions were found for "${runtimeKey}".`;
      }

      return null;
    })(),
  });
};

export const buildManagedPlaywrightActionSummaries = (args: {
  actions: PlaywrightAction[];
  runtimeKeys: readonly ActionSequenceKey[];
}): ManagedPlaywrightActionSummary[] =>
  args.runtimeKeys
    .map((runtimeKey) =>
      resolveStoredRuntimeActionSummary({
        actions: args.actions,
        runtimeKey,
      })
    )
    .filter((summary): summary is ManagedPlaywrightActionSummary => summary !== null);
