import type { PlaywrightSettings } from '@/shared/contracts/playwright';

type PlaywrightConnectionSettingsSource = {
  playwrightBrowser?: 'auto' | 'brave' | 'chrome' | 'chromium' | null | undefined;
  playwrightIdentityProfile?: 'default' | 'search' | 'marketplace' | null | undefined;
  playwrightHeadless?: boolean | null | undefined;
  playwrightSlowMo?: number | null | undefined;
  playwrightTimeout?: number | null | undefined;
  playwrightNavigationTimeout?: number | null | undefined;
  playwrightLocale?: string | null | undefined;
  playwrightTimezoneId?: string | null | undefined;
  playwrightHumanizeMouse?: boolean | null | undefined;
  playwrightMouseJitter?: number | null | undefined;
  playwrightClickDelayMin?: number | null | undefined;
  playwrightClickDelayMax?: number | null | undefined;
  playwrightInputDelayMin?: number | null | undefined;
  playwrightInputDelayMax?: number | null | undefined;
  playwrightActionDelayMin?: number | null | undefined;
  playwrightActionDelayMax?: number | null | undefined;
  playwrightProxyEnabled?: boolean | null | undefined;
  playwrightProxyServer?: string | null | undefined;
  playwrightProxyUsername?: string | null | undefined;
  playwrightProxyPassword?: string | null | undefined;
  playwrightProxySessionAffinity?: boolean | null | undefined;
  playwrightProxySessionMode?: 'sticky' | 'rotate' | null | undefined;
  playwrightProxyProviderPreset?: 'custom' | 'brightdata' | 'oxylabs' | 'decodo' | null | undefined;
  playwrightEmulateDevice?: boolean | null | undefined;
  playwrightDeviceName?: string | null | undefined;
  playwrightLaunchCooldownMs?: number | null | undefined;
  playwrightPrewarmWaitMs?: number | null | undefined;
  playwrightPostStartUrlWaitMs?: number | null | undefined;
  playwrightViewportJitterPx?: number | null | undefined;
  playwrightPostLoadNudgeEnabled?: boolean | null | undefined;
  playwrightPersonaId?: string | null | undefined;
};

export const DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER = 'auto' as const;

export const defaultIntegrationConnectionPlaywrightSettings: PlaywrightSettings = {
  identityProfile: 'default',
  headless: true,
  slowMo: 0,
  timeout: 30000,
  navigationTimeout: 30000,
  locale: '',
  timezoneId: '',
  humanizeMouse: true,
  mouseJitter: 5,
  clickDelayMin: 50,
  clickDelayMax: 150,
  inputDelayMin: 20,
  inputDelayMax: 80,
  actionDelayMin: 500,
  actionDelayMax: 1500,
  proxyEnabled: false,
  proxyServer: '',
  proxyUsername: '',
  proxyPassword: '',
  proxySessionAffinity: false,
  proxySessionMode: 'sticky',
  proxyProviderPreset: 'custom',
  emulateDevice: false,
  deviceName: 'Desktop Chrome',
  launchCooldownMs: 0,
  prewarmWaitMs: 0,
  postStartUrlWaitMs: 0,
  viewportJitterPx: 6,
  postLoadNudgeEnabled: true,
};

export const extractIntegrationConnectionPlaywrightSettingsOverrides = (
  connection?: PlaywrightConnectionSettingsSource | null
): Partial<PlaywrightSettings> => ({
  ...(connection?.playwrightIdentityProfile === 'default' ||
  connection?.playwrightIdentityProfile === 'search' ||
  connection?.playwrightIdentityProfile === 'marketplace'
    ? { identityProfile: connection.playwrightIdentityProfile }
    : {}),
  ...(typeof connection?.playwrightHeadless === 'boolean'
    ? { headless: connection.playwrightHeadless }
    : {}),
  ...(typeof connection?.playwrightSlowMo === 'number'
    ? { slowMo: connection.playwrightSlowMo }
    : {}),
  ...(typeof connection?.playwrightTimeout === 'number'
    ? { timeout: connection.playwrightTimeout }
    : {}),
  ...(typeof connection?.playwrightNavigationTimeout === 'number'
    ? { navigationTimeout: connection.playwrightNavigationTimeout }
    : {}),
  ...(typeof connection?.playwrightLocale === 'string'
    ? { locale: connection.playwrightLocale }
    : {}),
  ...(typeof connection?.playwrightTimezoneId === 'string'
    ? { timezoneId: connection.playwrightTimezoneId }
    : {}),
  ...(typeof connection?.playwrightHumanizeMouse === 'boolean'
    ? { humanizeMouse: connection.playwrightHumanizeMouse }
    : {}),
  ...(typeof connection?.playwrightMouseJitter === 'number'
    ? { mouseJitter: connection.playwrightMouseJitter }
    : {}),
  ...(typeof connection?.playwrightClickDelayMin === 'number'
    ? { clickDelayMin: connection.playwrightClickDelayMin }
    : {}),
  ...(typeof connection?.playwrightClickDelayMax === 'number'
    ? { clickDelayMax: connection.playwrightClickDelayMax }
    : {}),
  ...(typeof connection?.playwrightInputDelayMin === 'number'
    ? { inputDelayMin: connection.playwrightInputDelayMin }
    : {}),
  ...(typeof connection?.playwrightInputDelayMax === 'number'
    ? { inputDelayMax: connection.playwrightInputDelayMax }
    : {}),
  ...(typeof connection?.playwrightActionDelayMin === 'number'
    ? { actionDelayMin: connection.playwrightActionDelayMin }
    : {}),
  ...(typeof connection?.playwrightActionDelayMax === 'number'
    ? { actionDelayMax: connection.playwrightActionDelayMax }
    : {}),
  ...(typeof connection?.playwrightProxyEnabled === 'boolean'
    ? { proxyEnabled: connection.playwrightProxyEnabled }
    : {}),
  ...(typeof connection?.playwrightProxyServer === 'string'
    ? { proxyServer: connection.playwrightProxyServer }
    : {}),
  ...(typeof connection?.playwrightProxyUsername === 'string'
    ? { proxyUsername: connection.playwrightProxyUsername }
    : {}),
  ...(typeof connection?.playwrightProxyPassword === 'string'
    ? { proxyPassword: connection.playwrightProxyPassword }
    : {}),
  ...(typeof connection?.playwrightProxySessionAffinity === 'boolean'
    ? { proxySessionAffinity: connection.playwrightProxySessionAffinity }
    : {}),
  ...(connection?.playwrightProxySessionMode === 'sticky' ||
  connection?.playwrightProxySessionMode === 'rotate'
    ? { proxySessionMode: connection.playwrightProxySessionMode }
    : {}),
  ...(connection?.playwrightProxyProviderPreset === 'custom' ||
  connection?.playwrightProxyProviderPreset === 'brightdata' ||
  connection?.playwrightProxyProviderPreset === 'oxylabs' ||
  connection?.playwrightProxyProviderPreset === 'decodo'
    ? { proxyProviderPreset: connection.playwrightProxyProviderPreset }
    : {}),
  ...(typeof connection?.playwrightEmulateDevice === 'boolean'
    ? { emulateDevice: connection.playwrightEmulateDevice }
    : {}),
  ...(typeof connection?.playwrightDeviceName === 'string'
    ? { deviceName: connection.playwrightDeviceName }
    : {}),
  ...(typeof connection?.playwrightLaunchCooldownMs === 'number'
    ? { launchCooldownMs: connection.playwrightLaunchCooldownMs }
    : {}),
  ...(typeof connection?.playwrightPrewarmWaitMs === 'number'
    ? { prewarmWaitMs: connection.playwrightPrewarmWaitMs }
    : {}),
  ...(typeof connection?.playwrightPostStartUrlWaitMs === 'number'
    ? { postStartUrlWaitMs: connection.playwrightPostStartUrlWaitMs }
    : {}),
  ...(typeof connection?.playwrightViewportJitterPx === 'number'
    ? { viewportJitterPx: connection.playwrightViewportJitterPx }
    : {}),
  ...(typeof connection?.playwrightPostLoadNudgeEnabled === 'boolean'
    ? { postLoadNudgeEnabled: connection.playwrightPostLoadNudgeEnabled }
    : {}),
});

export const resolveIntegrationConnectionPlaywrightBrowserOverride = (
  connection?: Pick<PlaywrightConnectionSettingsSource, 'playwrightBrowser'> | null
): 'auto' | 'brave' | 'chrome' | 'chromium' | undefined => {
  const browser = connection?.playwrightBrowser;
  return browser === 'auto' || browser === 'brave' || browser === 'chrome' || browser === 'chromium'
    ? browser
    : undefined;
};

export const normalizeIntegrationConnectionPlaywrightPersonaId = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
