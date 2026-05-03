import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

const PROGRAMMABLE_RUNTIME_KEYS = new Set([
  'playwright_programmable_listing',
  'playwright_programmable_import',
]);

const ACTION_EXECUTION_SETTING_KEYS: Array<keyof PlaywrightAction['executionSettings']> = [
  'headless',
  'browserPreference',
  'emulateDevice',
  'deviceName',
  'slowMo',
  'timeout',
  'navigationTimeout',
  'locale',
  'timezoneId',
  'identityProfile',
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

export const supportsProgrammableSessionProfile = (action: PlaywrightAction): boolean => {
  const hasProgrammableRuntimeKey =
    action.runtimeKey !== null && PROGRAMMABLE_RUNTIME_KEYS.has(action.runtimeKey);
  const hasExecutionOverrides = ACTION_EXECUTION_SETTING_KEYS.some(
    (key) => action.executionSettings[key] !== null
  );
  const hasBrowserPreparationStep = action.blocks.some(
    (block) => block.kind === 'runtime_step' && block.refId === 'browser_preparation'
  );

  return hasProgrammableRuntimeKey || hasExecutionOverrides || hasBrowserPreparationStep;
};
