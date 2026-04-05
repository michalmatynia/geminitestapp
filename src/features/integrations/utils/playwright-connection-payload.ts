import type { PlaywrightSettings } from '@/shared/contracts/playwright';

export const toPlaywrightConnectionPayload = (
  settings: PlaywrightSettings
): Record<string, unknown> => ({
  playwrightHeadless: settings.headless,
  playwrightSlowMo: settings.slowMo,
  playwrightTimeout: settings.timeout,
  playwrightNavigationTimeout: settings.navigationTimeout,
  playwrightHumanizeMouse: settings.humanizeMouse,
  playwrightMouseJitter: settings.mouseJitter,
  playwrightClickDelayMin: settings.clickDelayMin,
  playwrightClickDelayMax: settings.clickDelayMax,
  playwrightInputDelayMin: settings.inputDelayMin,
  playwrightInputDelayMax: settings.inputDelayMax,
  playwrightActionDelayMin: settings.actionDelayMin,
  playwrightActionDelayMax: settings.actionDelayMax,
  playwrightProxyEnabled: settings.proxyEnabled,
  playwrightProxyServer: settings.proxyServer,
  playwrightProxyUsername: settings.proxyUsername,
  playwrightProxyPassword: settings.proxyPassword,
  playwrightEmulateDevice: settings.emulateDevice,
  playwrightDeviceName: settings.deviceName,
});
