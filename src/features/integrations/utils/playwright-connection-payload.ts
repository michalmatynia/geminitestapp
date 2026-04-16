import type { PlaywrightSettings } from '@/shared/contracts/playwright';

const PLAYWRIGHT_CONNECTION_SETTING_FIELDS = [
  ['playwrightIdentityProfile', 'identityProfile'],
  ['playwrightHeadless', 'headless'],
  ['playwrightSlowMo', 'slowMo'],
  ['playwrightTimeout', 'timeout'],
  ['playwrightNavigationTimeout', 'navigationTimeout'],
  ['playwrightLocale', 'locale'],
  ['playwrightTimezoneId', 'timezoneId'],
  ['playwrightHumanizeMouse', 'humanizeMouse'],
  ['playwrightMouseJitter', 'mouseJitter'],
  ['playwrightClickDelayMin', 'clickDelayMin'],
  ['playwrightClickDelayMax', 'clickDelayMax'],
  ['playwrightInputDelayMin', 'inputDelayMin'],
  ['playwrightInputDelayMax', 'inputDelayMax'],
  ['playwrightActionDelayMin', 'actionDelayMin'],
  ['playwrightActionDelayMax', 'actionDelayMax'],
  ['playwrightProxyEnabled', 'proxyEnabled'],
  ['playwrightProxyServer', 'proxyServer'],
  ['playwrightProxyUsername', 'proxyUsername'],
  ['playwrightProxySessionAffinity', 'proxySessionAffinity'],
  ['playwrightProxySessionMode', 'proxySessionMode'],
  ['playwrightProxyProviderPreset', 'proxyProviderPreset'],
  ['playwrightEmulateDevice', 'emulateDevice'],
  ['playwrightDeviceName', 'deviceName'],
] as const satisfies ReadonlyArray<
  readonly [string, keyof PlaywrightSettings]
>;

export const toPlaywrightConnectionPayload = (
  settings: PlaywrightSettings
): Record<string, unknown> =>
  PLAYWRIGHT_CONNECTION_SETTING_FIELDS.reduce(
    (payload, [connectionKey, settingsKey]) => ({
      ...payload,
      [connectionKey]: settings[settingsKey],
    }),
    {
      playwrightProxyPassword: settings.proxyPassword,
    } as Record<string, unknown>
  );

export const toPlaywrightConnectionOverridePayload = ({
  settings,
  baselineSettings,
  includeResetFlag = false,
}: {
  settings: PlaywrightSettings;
  baselineSettings: PlaywrightSettings;
  includeResetFlag?: boolean;
}): Record<string, unknown> => {
  const payload = PLAYWRIGHT_CONNECTION_SETTING_FIELDS.reduce((acc, [connectionKey, settingsKey]) => {
    if (settings[settingsKey] !== baselineSettings[settingsKey]) {
      acc[connectionKey] = settings[settingsKey];
    }
    return acc;
  }, {} as Record<string, unknown>);

  const normalizedProxyPassword = (settings.proxyPassword ?? '').trim();
  if (
    normalizedProxyPassword.length > 0 &&
    normalizedProxyPassword !== (baselineSettings.proxyPassword ?? '')
  ) {
    payload['playwrightProxyPassword'] = normalizedProxyPassword;
  }

  const shouldReset =
    includeResetFlag &&
    Object.keys(payload).length === 0 &&
    normalizedProxyPassword.length === 0;

  return {
    ...payload,
    ...(shouldReset ? { resetPlaywrightOverrides: true } : {}),
  };
};
