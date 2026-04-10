import 'server-only';

import type { PlaywrightSettings } from '@/shared/contracts/playwright';

export type PlaywrightExecutionSettingsSummary = Pick<
  PlaywrightSettings,
  | 'headless'
  | 'slowMo'
  | 'timeout'
  | 'navigationTimeout'
  | 'humanizeMouse'
  | 'mouseJitter'
  | 'clickDelayMin'
  | 'clickDelayMax'
  | 'inputDelayMin'
  | 'inputDelayMax'
  | 'actionDelayMin'
  | 'actionDelayMax'
  | 'emulateDevice'
  | 'deviceName'
> & {
  proxyEnabled: boolean;
};

export const buildPlaywrightExecutionSettingsSummary = (
  settings: Pick<
    PlaywrightSettings,
    | 'headless'
    | 'slowMo'
    | 'timeout'
    | 'navigationTimeout'
    | 'humanizeMouse'
    | 'mouseJitter'
    | 'clickDelayMin'
    | 'clickDelayMax'
    | 'inputDelayMin'
    | 'inputDelayMax'
    | 'actionDelayMin'
    | 'actionDelayMax'
    | 'emulateDevice'
    | 'deviceName'
  > & {
    proxyEnabled: boolean;
  }
): PlaywrightExecutionSettingsSummary => ({
  headless: settings.headless,
  slowMo: settings.slowMo,
  timeout: settings.timeout,
  navigationTimeout: settings.navigationTimeout,
  humanizeMouse: settings.humanizeMouse,
  mouseJitter: settings.mouseJitter,
  clickDelayMin: settings.clickDelayMin,
  clickDelayMax: settings.clickDelayMax,
  inputDelayMin: settings.inputDelayMin,
  inputDelayMax: settings.inputDelayMax,
  actionDelayMin: settings.actionDelayMin,
  actionDelayMax: settings.actionDelayMax,
  proxyEnabled: settings.proxyEnabled,
  emulateDevice: settings.emulateDevice,
  deviceName: settings.deviceName,
});
