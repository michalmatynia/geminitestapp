import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';

export const DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER = 'auto' as const;
export type IntegrationConnectionPlaywrightBrowser =
  | typeof DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER
  | 'brave'
  | 'chrome'
  | 'chromium';

type PlaywrightSettingsWithOptionalBrowser = PlaywrightSettings & {
  browser?: IntegrationConnectionPlaywrightBrowser;
};

const PLAYWRIGHT_BROWSER_VALUES = ['auto', 'brave', 'chrome', 'chromium'] as const;
const PLAYWRIGHT_IDENTITY_PROFILE_VALUES = ['default', 'search', 'marketplace'] as const;
const PLAYWRIGHT_PROXY_SESSION_MODE_VALUES = ['sticky', 'rotate'] as const;
const PLAYWRIGHT_PROXY_PROVIDER_PRESET_VALUES = [
  'custom',
  'brightdata',
  'oxylabs',
  'decodo',
] as const;

const normalizeStringEnum = <T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return allowedValues.includes(value as T) ? (value as T) : undefined;
};

const normalizeIntegrationConnectionPlaywrightBrowser = (
  value: unknown
): IntegrationConnectionPlaywrightBrowser | undefined =>
  normalizeStringEnum(value, PLAYWRIGHT_BROWSER_VALUES);

const normalizeIntegrationConnectionPlaywrightIdentityProfile = (
  value: unknown
): PlaywrightSettings['identityProfile'] | undefined =>
  normalizeStringEnum(value, PLAYWRIGHT_IDENTITY_PROFILE_VALUES);

const normalizeIntegrationConnectionPlaywrightProxySessionMode = (
  value: unknown
): PlaywrightSettings['proxySessionMode'] | undefined =>
  normalizeStringEnum(value, PLAYWRIGHT_PROXY_SESSION_MODE_VALUES);

const normalizeIntegrationConnectionPlaywrightProxyProviderPreset = (
  value: unknown
): PlaywrightSettings['proxyProviderPreset'] | undefined =>
  normalizeStringEnum(value, PLAYWRIGHT_PROXY_PROVIDER_PRESET_VALUES);

const resolveNormalizedPlaywrightBrowserOverride = (
  settings?: Partial<PlaywrightSettings> | null
): Pick<PlaywrightSettingsWithOptionalBrowser, 'browser'> | {} => {
  const browserValue = (settings as { browser?: unknown } | null | undefined)?.browser;
  const browser = normalizeIntegrationConnectionPlaywrightBrowser(browserValue);
  return browser !== undefined ? { browser } : {};
};

const resolveNormalizedPlaywrightIdentityProfile = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings['identityProfile'] =>
  normalizeIntegrationConnectionPlaywrightIdentityProfile(settings?.identityProfile) ??
  defaultIntegrationConnectionPlaywrightSettings.identityProfile;

const resolveNormalizedPlaywrightProxySessionMode = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings['proxySessionMode'] =>
  normalizeIntegrationConnectionPlaywrightProxySessionMode(settings?.proxySessionMode) ??
  defaultIntegrationConnectionPlaywrightSettings.proxySessionMode;

const resolveNormalizedPlaywrightProxyProviderPreset = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings['proxyProviderPreset'] =>
  normalizeIntegrationConnectionPlaywrightProxyProviderPreset(settings?.proxyProviderPreset) ??
  defaultIntegrationConnectionPlaywrightSettings.proxyProviderPreset;

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

const resolveNormalizedPlaywrightEnumOverrides = (
  settings?: Partial<PlaywrightSettings> | null
): Partial<PlaywrightSettingsWithOptionalBrowser> => ({
  identityProfile: resolveNormalizedPlaywrightIdentityProfile(settings),
  proxySessionMode: resolveNormalizedPlaywrightProxySessionMode(settings),
  proxyProviderPreset: resolveNormalizedPlaywrightProxyProviderPreset(settings),
  ...resolveNormalizedPlaywrightBrowserOverride(settings),
});

export const buildIntegrationConnectionPlaywrightSettings = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings => {
  const builtSettings: PlaywrightSettingsWithOptionalBrowser = {
    ...defaultIntegrationConnectionPlaywrightSettings,
    ...(settings ?? {}),
    ...resolveNormalizedPlaywrightEnumOverrides(settings),
  };
  return builtSettings;
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

const createIntegrationPlaywrightPersonaId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const resolveStoredPlaywrightPersonaId = (value: unknown): string => {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : createIntegrationPlaywrightPersonaId();
};

const resolveStoredPlaywrightPersonaCreatedAt = (value: unknown): string => {
  return typeof value === 'string' ? value : new Date().toISOString();
};

const resolveStoredPlaywrightPersonaUpdatedAt = (
  value: unknown,
  createdAt: string
): string => {
  return typeof value === 'string' ? value : createdAt;
};

const resolveStoredPlaywrightPersonaDescription = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const resolveStoredPlaywrightPersonaSettings = (value: unknown): PlaywrightSettings => {
  return value !== null && typeof value === 'object'
    ? buildIntegrationConnectionPlaywrightSettings(value as Partial<PlaywrightSettings>)
    : buildIntegrationConnectionPlaywrightSettings();
};

export const resolveIntegrationPlaywrightPersonaSettings = (
  personas: ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>> | null | undefined,
  personaId: string | null | undefined
): PlaywrightSettings => {
  const normalizedPersonaId = normalizeIntegrationConnectionPlaywrightPersonaId(personaId);
  if (normalizedPersonaId === null) {
    return defaultIntegrationConnectionPlaywrightSettings;
  }

  const persona = personas?.find((entry) => entry.id === normalizedPersonaId);
  if (persona === undefined) {
    return defaultIntegrationConnectionPlaywrightSettings;
  }

  return buildIntegrationConnectionPlaywrightSettings(persona.settings);
};

const normalizeStoredPlaywrightPersona = (item: unknown): PlaywrightPersona | null => {
  if (item === null || typeof item !== 'object') {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
  if (name.length === 0) {
    return null;
  }

  const id = resolveStoredPlaywrightPersonaId(raw['id']);
  const createdAt = resolveStoredPlaywrightPersonaCreatedAt(raw['createdAt']);
  const updatedAt = resolveStoredPlaywrightPersonaUpdatedAt(raw['updatedAt'], createdAt);
  const description = resolveStoredPlaywrightPersonaDescription(raw['description']);
  const settings = resolveStoredPlaywrightPersonaSettings(raw['settings']);

  const persona: PlaywrightPersona = {
    id,
    name,
    description,
    settings,
    createdAt,
    updatedAt,
  };
  return persona;
};

export const normalizeIntegrationPlaywrightPersonas = (
  value: unknown
): PlaywrightPersona[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeStoredPlaywrightPersona(item))
    .filter((item): item is PlaywrightPersona => item !== null);
};
