import type {
  PlaywrightAction,
  PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';

import { buildIntegrationConnectionPlaywrightSettings } from './playwright-settings-baseline';

export const PLAYWRIGHT_ACTION_SETTINGS_TO_PLAYWRIGHT_SETTINGS_KEYS: Array<
  Exclude<keyof PlaywrightActionExecutionSettings, 'browserPreference'>
> = [
  'identityProfile',
  'headless',
  'emulateDevice',
  'deviceName',
  'slowMo',
  'timeout',
  'navigationTimeout',
  'locale',
  'timezoneId',
  'humanizeMouse',
  'mouseJitter',
  'clickDelayMin',
  'clickDelayMax',
  'inputDelayMin',
  'inputDelayMax',
  'actionDelayMin',
  'actionDelayMax',
  'proxyEnabled',
  'proxyServer',
  'proxyUsername',
  'proxyPassword',
  'proxySessionAffinity',
  'proxySessionMode',
  'proxyProviderPreset',
];

const formatBooleanSummary = ({
  value,
  enabledLabel,
  disabledLabel,
}: {
  value: boolean | null;
  enabledLabel: string;
  disabledLabel: string;
}): string | null => {
  if (value === null) {
    return null;
  }

  return value ? enabledLabel : disabledLabel;
};

const formatTimeoutSummary = (label: string, value: number | null): string | null =>
  value === null ? null : `${label}: ${value}ms`;

const formatDeviceSummary = (
  settings: PlaywrightActionExecutionSettings
): string | null => {
  if (settings.emulateDevice === null) {
    return null;
  }

  if (settings.emulateDevice === false) {
    return 'Device emulation disabled';
  }

  return settings.deviceName === null
    ? 'Device emulation enabled'
    : `Device: ${settings.deviceName}`;
};

const formatHumanizationSummary = (
  settings: PlaywrightActionExecutionSettings
): string[] =>
  [
    formatBooleanSummary({
      value: settings.humanizeMouse,
      enabledLabel: 'Humanize mouse enabled',
      disabledLabel: 'Humanize mouse disabled',
    }),
    settings.mouseJitter === null ? null : `Mouse jitter: ${settings.mouseJitter}`,
    settings.clickDelayMin === null ? null : `Click min: ${settings.clickDelayMin}ms`,
    settings.clickDelayMax === null ? null : `Click max: ${settings.clickDelayMax}ms`,
    settings.inputDelayMin === null ? null : `Input min: ${settings.inputDelayMin}ms`,
    settings.inputDelayMax === null ? null : `Input max: ${settings.inputDelayMax}ms`,
    settings.actionDelayMin === null ? null : `Action min: ${settings.actionDelayMin}ms`,
    settings.actionDelayMax === null ? null : `Action max: ${settings.actionDelayMax}ms`,
  ].filter((entry): entry is string => typeof entry === 'string');

const formatProxySummary = (
  settings: PlaywrightActionExecutionSettings
): string[] =>
  [
    formatBooleanSummary({
      value: settings.proxyEnabled,
      enabledLabel: 'Proxy enabled',
      disabledLabel: 'Proxy disabled',
    }),
    settings.proxyServer === null ? null : `Proxy server: ${settings.proxyServer}`,
    settings.proxyUsername === null ? null : 'Proxy username set',
    settings.proxyPassword === null ? null : 'Proxy password set',
    formatBooleanSummary({
      value: settings.proxySessionAffinity,
      enabledLabel: 'Proxy session affinity enabled',
      disabledLabel: 'Proxy session affinity disabled',
    }),
    settings.proxySessionMode === null ? null : `Proxy session mode: ${settings.proxySessionMode}`,
    settings.proxyProviderPreset === null
      ? null
      : `Proxy preset: ${settings.proxyProviderPreset}`,
  ].filter((entry): entry is string => typeof entry === 'string');

export const formatPlaywrightActionExecutionSettingsSummary = (
  settings: PlaywrightActionExecutionSettings
): string[] => {
  return [
    settings.identityProfile === null ? null : `Identity: ${settings.identityProfile}`,
    formatBooleanSummary({
      value: settings.headless,
      enabledLabel: 'Headless',
      disabledLabel: 'Headed',
    }),
    settings.browserPreference === null ? null : `Browser: ${settings.browserPreference}`,
    formatDeviceSummary(settings),
    formatTimeoutSummary('SlowMo', settings.slowMo),
    formatTimeoutSummary('Timeout', settings.timeout),
    formatTimeoutSummary('Navigation timeout', settings.navigationTimeout),
    settings.locale === null ? null : `Locale: ${settings.locale}`,
    settings.timezoneId === null ? null : `Timezone: ${settings.timezoneId}`,
    ...formatHumanizationSummary(settings),
    ...formatProxySummary(settings),
  ].filter((entry): entry is string => typeof entry === 'string');
};

export const applyActionExecutionSettingsToPlaywrightSettings = ({
  baseSettings,
  action,
}: {
  baseSettings: PlaywrightSettings;
  action: PlaywrightAction;
}): PlaywrightSettings => {
  const overrides = Object.fromEntries(
    PLAYWRIGHT_ACTION_SETTINGS_TO_PLAYWRIGHT_SETTINGS_KEYS.map((key) => [
      key,
      action.executionSettings[key],
    ]).filter(([, value]) => value !== null)
  ) as Partial<PlaywrightSettings>;

  return buildIntegrationConnectionPlaywrightSettings({
    ...baseSettings,
    ...overrides,
  });
};
