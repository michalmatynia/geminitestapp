import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type {
  PlaywrightAction,
  PlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';
import {
  hasPlaywrightActionBlockConfigOverrides,
  normalizePlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';
import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { type ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import { analyzeLoadedPlaywrightActions } from '@/shared/lib/browser-execution/playwright-actions-settings-validation';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { formatPlaywrightActionExecutionSettingsSummary } from './playwright-action-execution-settings';

const PREPARATION_STEP_ID = 'browser_preparation';

export type IntegrationManagedPlaywrightActionSummary = {
  action: PlaywrightAction;
  browserPreparationConfig: PlaywrightActionBlockConfig | null;
  browserPreparationSummary: string[];
  executionSettingsSummary: string[];
  fallbackActive: boolean;
  fallbackReason: string | null;
  runtimeKey: ActionSequenceKey;
};

const formatViewportSummary = (
  config: PlaywrightActionBlockConfig
): string | null => {
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

const buildSummary = ({
  action,
  runtimeKey,
  fallbackActive,
  fallbackReason,
}: {
  action: PlaywrightAction;
  runtimeKey: ActionSequenceKey;
  fallbackActive: boolean;
  fallbackReason: string | null;
}): IntegrationManagedPlaywrightActionSummary => {
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

const resolveStoredRuntimeAction = ({
  actions,
  runtimeKey,
}: {
  actions: PlaywrightAction[];
  runtimeKey: ActionSequenceKey;
}): IntegrationManagedPlaywrightActionSummary | null => {
  const groupedActions = actions.filter((action) => action.runtimeKey === runtimeKey);
  const analysis = analyzeLoadedPlaywrightActions(actions);
  const invalidAction = groupedActions.find(
    (action) => typeof analysis.runtimeActionErrorsById[action.id] === 'string'
  );

  if (groupedActions.length === 1 && invalidAction === undefined) {
    const stored = groupedActions[0];
    if (stored !== undefined) {
      return buildSummary({
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

  return buildSummary({
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

export const resolveIntegrationManagedRuntimeActionKeys = (args: {
  integrationSlug: string | null | undefined;
  connection?: Pick<IntegrationConnection, 'traderaBrowserMode'> | null;
}): ActionSequenceKey[] => {
  if (isTraderaBrowserIntegrationSlug(args.integrationSlug)) {
    const traderaListActionKey: ActionSequenceKey =
      args.connection?.traderaBrowserMode === 'scripted'
        ? 'tradera_quicklist_list'
        : 'tradera_standard_list';

    return [
      'tradera_auth',
      traderaListActionKey,
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
      'tradera_check_status',
      'tradera_fetch_categories',
    ];
  }

  if (isVintedIntegrationSlug(args.integrationSlug)) {
    return ['vinted_list', 'vinted_relist', 'vinted_sync'];
  }

  if (isPlaywrightProgrammableSlug(args.integrationSlug)) {
    return ['playwright_programmable_listing', 'playwright_programmable_import'];
  }

  return [];
};

export const buildIntegrationManagedPlaywrightActionSummaries = (args: {
  actions: PlaywrightAction[];
  runtimeKeys: readonly ActionSequenceKey[];
}): IntegrationManagedPlaywrightActionSummary[] =>
  args.runtimeKeys
    .map((runtimeKey) =>
      resolveStoredRuntimeAction({
        actions: args.actions,
        runtimeKey,
      })
    )
    .filter(
      (summary): summary is IntegrationManagedPlaywrightActionSummary => summary !== null
    );
