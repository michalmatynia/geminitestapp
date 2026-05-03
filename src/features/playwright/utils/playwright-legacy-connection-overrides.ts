import type { PlaywrightSettings } from '@/shared/contracts/playwright';

type PlaywrightConnectionSettingsSource = {
  playwrightIdentityProfile?: 'default' | 'search' | 'marketplace' | null | undefined;
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

type LegacySettingKey = keyof PlaywrightSettings;
type LegacyConnectionKey = keyof PlaywrightConnectionSettingsSource;

const NUMBER_OVERRIDE_MAPPINGS: ReadonlyArray<
  readonly [LegacyConnectionKey, LegacySettingKey]
> = [
  ['playwrightSlowMo', 'slowMo'],
  ['playwrightTimeout', 'timeout'],
  ['playwrightNavigationTimeout', 'navigationTimeout'],
  ['playwrightMouseJitter', 'mouseJitter'],
  ['playwrightClickDelayMin', 'clickDelayMin'],
  ['playwrightClickDelayMax', 'clickDelayMax'],
  ['playwrightInputDelayMin', 'inputDelayMin'],
  ['playwrightInputDelayMax', 'inputDelayMax'],
  ['playwrightActionDelayMin', 'actionDelayMin'],
  ['playwrightActionDelayMax', 'actionDelayMax'],
  ['playwrightLaunchCooldownMs', 'launchCooldownMs'],
  ['playwrightPrewarmWaitMs', 'prewarmWaitMs'],
  ['playwrightPostStartUrlWaitMs', 'postStartUrlWaitMs'],
  ['playwrightViewportJitterPx', 'viewportJitterPx'],
];

const STRING_OVERRIDE_MAPPINGS: ReadonlyArray<
  readonly [LegacyConnectionKey, LegacySettingKey]
> = [
  ['playwrightLocale', 'locale'],
  ['playwrightTimezoneId', 'timezoneId'],
  ['playwrightProxyServer', 'proxyServer'],
  ['playwrightProxyUsername', 'proxyUsername'],
  ['playwrightProxyPassword', 'proxyPassword'],
  ['playwrightDeviceName', 'deviceName'],
];

const BOOLEAN_OVERRIDE_MAPPINGS: ReadonlyArray<
  readonly [LegacyConnectionKey, LegacySettingKey]
> = [
  ['playwrightHumanizeMouse', 'humanizeMouse'],
  ['playwrightProxyEnabled', 'proxyEnabled'],
  ['playwrightProxySessionAffinity', 'proxySessionAffinity'],
  ['playwrightEmulateDevice', 'emulateDevice'],
  ['playwrightPostLoadNudgeEnabled', 'postLoadNudgeEnabled'],
];

const collectMappedOverrides = (
  connection: PlaywrightConnectionSettingsSource,
  mappings: ReadonlyArray<readonly [LegacyConnectionKey, LegacySettingKey]>,
  expectedType: 'boolean' | 'number' | 'string'
): Partial<PlaywrightSettings> => {
  const overrides: Partial<PlaywrightSettings> = {};
  const mutableOverrides = overrides as Record<string, unknown>;

  for (const [sourceKey, targetKey] of mappings) {
    const value = connection[sourceKey];
    if (typeof value === expectedType) {
      mutableOverrides[targetKey] = value;
    }
  }

  return overrides;
};

const normalizeStringEnum = <T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return allowedValues.includes(value as T) ? (value as T) : undefined;
};

const buildEnumOverrides = (
  connection: PlaywrightConnectionSettingsSource
): Partial<PlaywrightSettings> => {
  const identityProfile = normalizeStringEnum(connection.playwrightIdentityProfile, [
    'default',
    'search',
    'marketplace',
  ] as const);
  const proxySessionMode = normalizeStringEnum(connection.playwrightProxySessionMode, [
    'sticky',
    'rotate',
  ] as const);
  const proxyProviderPreset = normalizeStringEnum(connection.playwrightProxyProviderPreset, [
    'custom',
    'brightdata',
    'oxylabs',
    'decodo',
  ] as const);

  return {
    ...(identityProfile !== undefined ? { identityProfile } : {}),
    ...(proxySessionMode !== undefined ? { proxySessionMode } : {}),
    ...(proxyProviderPreset !== undefined ? { proxyProviderPreset } : {}),
  };
};

const buildNumberOverrides = (
  connection: PlaywrightConnectionSettingsSource
): Partial<PlaywrightSettings> => {
  return collectMappedOverrides(connection, NUMBER_OVERRIDE_MAPPINGS, 'number');
};

const buildStringOverrides = (
  connection: PlaywrightConnectionSettingsSource
): Partial<PlaywrightSettings> => {
  return collectMappedOverrides(connection, STRING_OVERRIDE_MAPPINGS, 'string');
};

const buildBooleanOverrides = (
  connection: PlaywrightConnectionSettingsSource
): Partial<PlaywrightSettings> => {
  return collectMappedOverrides(connection, BOOLEAN_OVERRIDE_MAPPINGS, 'boolean');
};

export const extractIntegrationConnectionPlaywrightSettingsOverrides = (
  connection?: PlaywrightConnectionSettingsSource | null
): Partial<PlaywrightSettings> => {
  if (connection === null || connection === undefined) {
    return {};
  }

  return {
    ...buildEnumOverrides(connection),
    ...buildNumberOverrides(connection),
    ...buildStringOverrides(connection),
    ...buildBooleanOverrides(connection),
  };
};
