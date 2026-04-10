import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';

type PlaywrightConnectionSettingsSource = {
  playwrightBrowser?: 'auto' | 'brave' | 'chrome' | 'chromium' | null | undefined;
  playwrightHeadless?: boolean | null | undefined;
  playwrightSlowMo?: number | null | undefined;
  playwrightTimeout?: number | null | undefined;
  playwrightNavigationTimeout?: number | null | undefined;
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
  playwrightEmulateDevice?: boolean | null | undefined;
  playwrightDeviceName?: string | null | undefined;
  playwrightPersonaId?: string | null | undefined;
};

export const DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER = 'auto' as const;
export type IntegrationConnectionPlaywrightBrowser =
  | typeof DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER
  | 'brave'
  | 'chrome'
  | 'chromium';

type PlaywrightSettingsWithOptionalBrowser = PlaywrightSettings & {
  browser?: IntegrationConnectionPlaywrightBrowser;
};

const normalizeIntegrationConnectionPlaywrightBrowser = (
  value: unknown
): IntegrationConnectionPlaywrightBrowser | undefined => {
  return value === 'auto' || value === 'brave' || value === 'chrome' || value === 'chromium'
    ? value
    : undefined;
};

export const defaultIntegrationConnectionPlaywrightSettings: PlaywrightSettings = {
  headless: true,
  slowMo: 0,
  timeout: 30000,
  navigationTimeout: 30000,
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
  emulateDevice: false,
  deviceName: 'Desktop Chrome',
};

export const buildIntegrationConnectionPlaywrightSettings = (
  settings?: Partial<PlaywrightSettings> | null
): PlaywrightSettings => {
  const normalizedBrowser = normalizeIntegrationConnectionPlaywrightBrowser(
    (settings as { browser?: unknown } | null | undefined)?.browser
  );
  const builtSettings: PlaywrightSettingsWithOptionalBrowser = {
    ...defaultIntegrationConnectionPlaywrightSettings,
    ...(settings ?? {}),
  };
  if (normalizedBrowser) {
    builtSettings.browser = normalizedBrowser;
  }
  return builtSettings;
};

export const resolveIntegrationPlaywrightPersonaSettings = (
  personas: ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>> | null | undefined,
  personaId: string | null | undefined
): PlaywrightSettings => {
  const normalizedPersonaId = normalizeIntegrationConnectionPlaywrightPersonaId(personaId);
  if (!normalizedPersonaId) {
    return defaultIntegrationConnectionPlaywrightSettings;
  }

  const persona = personas?.find((entry) => entry.id === normalizedPersonaId);
  return persona
    ? buildIntegrationConnectionPlaywrightSettings(persona.settings)
    : defaultIntegrationConnectionPlaywrightSettings;
};

export const resolveIntegrationPlaywrightPersonaBrowser = (
  personas: ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>> | null | undefined,
  personaId: string | null | undefined
): IntegrationConnectionPlaywrightBrowser => {
  const normalizedPersonaId = normalizeIntegrationConnectionPlaywrightPersonaId(personaId);
  if (!normalizedPersonaId) {
    return DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER;
  }

  const persona = personas?.find((entry) => entry.id === normalizedPersonaId);
  return (
    normalizeIntegrationConnectionPlaywrightBrowser(
      (persona?.settings as PlaywrightSettingsWithOptionalBrowser | undefined)?.browser
    ) ?? DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER
  );
};

export const extractIntegrationConnectionPlaywrightSettingsOverrides = (
  connection?: PlaywrightConnectionSettingsSource | null
): Partial<PlaywrightSettings> => ({
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
  ...(typeof connection?.playwrightEmulateDevice === 'boolean'
    ? { emulateDevice: connection.playwrightEmulateDevice }
    : {}),
  ...(typeof connection?.playwrightDeviceName === 'string'
    ? { deviceName: connection.playwrightDeviceName }
    : {}),
});

export const resolveIntegrationConnectionPlaywrightSettings = (
  connection?: PlaywrightConnectionSettingsSource | null
): PlaywrightSettings =>
  buildIntegrationConnectionPlaywrightSettings(
    extractIntegrationConnectionPlaywrightSettingsOverrides(connection)
  );

export const resolveIntegrationConnectionPlaywrightSettingsWithPersona = (
  connection: PlaywrightConnectionSettingsSource | null | undefined,
  personas: ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>> | null | undefined
): PlaywrightSettings =>
  buildIntegrationConnectionPlaywrightSettings({
    ...resolveIntegrationPlaywrightPersonaSettings(personas, connection?.playwrightPersonaId),
    ...extractIntegrationConnectionPlaywrightSettingsOverrides(connection),
  });

export const resolveIntegrationConnectionPlaywrightBrowserOverride = (
  connection?: Pick<PlaywrightConnectionSettingsSource, 'playwrightBrowser'> | null
): 'auto' | 'brave' | 'chrome' | 'chromium' | undefined => {
  const browser = connection?.playwrightBrowser;
  return browser === 'auto' || browser === 'brave' || browser === 'chrome' || browser === 'chromium'
    ? browser
    : undefined;
};

export const resolveIntegrationConnectionPlaywrightBrowser = (
  connection?: Pick<PlaywrightConnectionSettingsSource, 'playwrightBrowser'> | null
): IntegrationConnectionPlaywrightBrowser => {
  return (
    resolveIntegrationConnectionPlaywrightBrowserOverride(connection) ??
    DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER
  );
};

export const resolveIntegrationConnectionPlaywrightBrowserWithPersona = (
  connection:
    | Pick<PlaywrightConnectionSettingsSource, 'playwrightBrowser' | 'playwrightPersonaId'>
    | null
    | undefined,
  personas: ReadonlyArray<Pick<PlaywrightPersona, 'id' | 'settings'>> | null | undefined
): IntegrationConnectionPlaywrightBrowser => {
  return (
    resolveIntegrationConnectionPlaywrightBrowserOverride(connection) ??
    resolveIntegrationPlaywrightPersonaBrowser(personas, connection?.playwrightPersonaId)
  );
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

export const normalizeIntegrationPlaywrightPersonas = (
  value: unknown
): PlaywrightPersona[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): PlaywrightPersona | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as PlaywrightPersona;
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) return null;

      const id =
        typeof raw.id === 'string' && raw.id.trim()
          ? raw.id
          : createIntegrationPlaywrightPersonaId();
      const createdAt =
        typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
      const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;
      const description = typeof raw.description === 'string' ? raw.description : null;
      const settings =
        raw.settings && typeof raw.settings === 'object'
          ? buildIntegrationConnectionPlaywrightSettings(raw.settings as Partial<PlaywrightSettings>)
          : buildIntegrationConnectionPlaywrightSettings();

      return {
        id,
        name,
        description,
        settings,
        createdAt,
        updatedAt,
      } as PlaywrightPersona;
    })
    .filter((item: PlaywrightPersona | null): item is PlaywrightPersona => Boolean(item));
};
