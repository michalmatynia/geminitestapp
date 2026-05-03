import type {
  PlaywrightAction,
  PlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import { type ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  hasPlaywrightActionBlockConfigOverrides,
  normalizePlaywrightActionBlockConfig,
} from '@/shared/contracts/playwright-steps';

import {
  applyActionExecutionSettingsToPlaywrightSettings,
  formatPlaywrightActionExecutionSettingsSummary,
} from './playwright-action-execution-settings';
import {
  buildIntegrationConnectionPlaywrightSettings,
  resolveIntegrationPlaywrightPersonaSettings,
} from './playwright-settings-baseline';
import { supportsProgrammableSessionProfile } from './playwright-programmable-session-support';

export type ProgrammableSessionPreview = {
  action: PlaywrightAction;
  isDefault: boolean;
  actionBaselineSettings: PlaywrightSettings;
  actionSettingsSummary: string[];
  browserPreparationSummary: string[];
  effectiveSummary: string[];
  overrideSummary: string[];
};

const CONNECTION_OVERRIDE_LABELS: Array<[keyof PlaywrightSettings, string]> = [
  ['identityProfile', 'Identity profile'],
  ['headless', 'Headless mode'],
  ['slowMo', 'SlowMo'],
  ['timeout', 'Timeout'],
  ['navigationTimeout', 'Navigation timeout'],
  ['locale', 'Locale'],
  ['timezoneId', 'Timezone'],
  ['humanizeMouse', 'Humanize mouse'],
  ['mouseJitter', 'Mouse jitter'],
  ['clickDelayMin', 'Click delay min'],
  ['clickDelayMax', 'Click delay max'],
  ['inputDelayMin', 'Input delay min'],
  ['inputDelayMax', 'Input delay max'],
  ['actionDelayMin', 'Action delay min'],
  ['actionDelayMax', 'Action delay max'],
  ['proxyEnabled', 'Proxy enabled'],
  ['proxyServer', 'Proxy server'],
  ['proxyUsername', 'Proxy username'],
  ['proxyPassword', 'Proxy password'],
  ['proxySessionAffinity', 'Proxy session affinity'],
  ['proxySessionMode', 'Proxy session mode'],
  ['proxyProviderPreset', 'Proxy provider preset'],
  ['emulateDevice', 'Device emulation'],
  ['deviceName', 'Device'],
];

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

const resolveBrowserPreparationConfig = (
  action: PlaywrightAction
): PlaywrightActionBlockConfig | null => {
  const preparationBlock = action.blocks.find(
    (block) =>
      block.enabled &&
      block.kind === 'runtime_step' &&
      block.refId === 'browser_preparation' &&
      hasPlaywrightActionBlockConfigOverrides(block.config)
  );

  if (preparationBlock === undefined) {
    return null;
  }

  return normalizePlaywrightActionBlockConfig(preparationBlock.config);
};

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

const formatSettingsLocaleSummary = (settings: PlaywrightSettings): string | null => {
  const locale = settings.locale ?? '';
  return locale.trim().length > 0 ? `Locale: ${locale}` : null;
};

const formatSettingsTimezoneSummary = (settings: PlaywrightSettings): string | null => {
  const timezoneId = settings.timezoneId ?? '';
  return timezoneId.trim().length > 0 ? `Timezone: ${timezoneId}` : null;
};

const formatSettingsDeviceSummary = (settings: PlaywrightSettings): string | null => {
  return settings.emulateDevice ? `Device: ${settings.deviceName}` : null;
};

const formatEffectiveSummary = (action: PlaywrightAction, settings: PlaywrightSettings): string[] => {
  return [
    settings.headless ? 'Headless' : 'Headed',
    action.executionSettings.browserPreference !== null
      ? `Browser: ${action.executionSettings.browserPreference}`
      : null,
    formatSettingsDeviceSummary(settings),
    formatSettingsLocaleSummary(settings),
    formatSettingsTimezoneSummary(settings),
    settings.slowMo > 0 ? `SlowMo: ${settings.slowMo}ms` : null,
    `Timeout: ${settings.timeout}ms`,
    `Navigation timeout: ${settings.navigationTimeout}ms`,
  ].filter((entry): entry is string => entry !== null);
};

const buildOverrideSummary = ({
  currentSettings,
  personaBaseline,
}: {
  currentSettings: PlaywrightSettings;
  personaBaseline: PlaywrightSettings;
}): string[] =>
  CONNECTION_OVERRIDE_LABELS.filter(
    ([key]) => currentSettings[key] !== personaBaseline[key]
  ).map(([, label]) => label);

const resolveProgrammableSessionAction = ({
  actions,
  selectedActionId,
  defaultRuntimeKey,
}: {
  actions: PlaywrightAction[] | undefined;
  selectedActionId: string;
  defaultRuntimeKey: ActionSequenceKey;
}): { action: PlaywrightAction; isDefault: boolean } => {
  const normalizedSelectedActionId = selectedActionId.trim();
  const selectedAction =
    normalizedSelectedActionId.length > 0
      ? (actions ?? []).find(
          (action) =>
            action.id === normalizedSelectedActionId &&
            supportsProgrammableSessionProfile(action)
        ) ?? null
      : null;

  if (selectedAction !== null) {
    return {
      action: selectedAction,
      isDefault: false,
    };
  }

  return {
    action: getPlaywrightRuntimeActionSeed(defaultRuntimeKey) as PlaywrightAction,
    isDefault: true,
  };
};

export const buildProgrammableSessionPreview = ({
  actions,
  selectedActionId,
  defaultRuntimeKey,
  personaBaseline,
  currentSettings,
  personas,
}: {
  actions: PlaywrightAction[] | undefined;
  selectedActionId: string;
  defaultRuntimeKey: ActionSequenceKey;
  personaBaseline: PlaywrightSettings;
  currentSettings: PlaywrightSettings;
  personas: Array<{ id: string; settings: PlaywrightSettings }> | undefined;
}): ProgrammableSessionPreview => {
  const { action, isDefault } = resolveProgrammableSessionAction({
    actions,
    selectedActionId,
    defaultRuntimeKey,
  });
  const browserPreparationConfig = resolveBrowserPreparationConfig(action);
  const actionPersonaBaseline =
    action.personaId === null
      ? personaBaseline
      : resolveIntegrationPlaywrightPersonaSettings(personas, action.personaId);
  const actionBaseline = applyActionExecutionSettingsToPlaywrightSettings({
    baseSettings: actionPersonaBaseline,
    action,
  });
  const effectiveSettings = buildIntegrationConnectionPlaywrightSettings({
    ...actionBaseline,
    ...Object.fromEntries(
      CONNECTION_OVERRIDE_LABELS.filter(
        ([key]) => currentSettings[key] !== personaBaseline[key]
      ).map(([key]) => [key, currentSettings[key]])
    ),
  });

  return {
    action,
    isDefault,
    actionBaselineSettings: actionBaseline,
    actionSettingsSummary: [
      ...(action.personaId !== null ? [`Persona: ${action.personaId}`] : []),
      ...formatPlaywrightActionExecutionSettingsSummary(action.executionSettings),
    ],
    browserPreparationSummary: formatBrowserPreparationSummary(browserPreparationConfig),
    effectiveSummary: formatEffectiveSummary(action, effectiveSettings),
    overrideSummary: buildOverrideSummary({
      currentSettings,
      personaBaseline,
    }),
  };
};

export { applyActionExecutionSettingsToPlaywrightSettings };
