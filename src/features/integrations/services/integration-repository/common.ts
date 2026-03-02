import { ObjectId } from 'mongodb';
import {
  IntegrationRecord,
  IntegrationConnectionRecord,
  ConnectionDeleteOptions,
  ConnectionDependencyCounts,
} from '@/shared/contracts/integrations';

export type { ConnectionDeleteOptions, ConnectionDependencyCounts };

export const INTEGRATION_COLLECTION = 'integrations';
export const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
export const DEFAULT_CONNECTION_SETTING_KEY = 'base_export_default_connection_id';
export const PRODUCT_SYNC_PROFILE_SETTINGS_KEY = 'product_sync_profiles';
export const ACTIVE_TEMPLATE_SETTING_KEY = 'base_export_active_template_id';
export const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';

export const CONNECTION_DEFAULTS = {
  playwrightHeadless: true,
  playwrightSlowMo: 0,
  playwrightTimeout: 30000,
  playwrightNavigationTimeout: 30000,
  playwrightHumanizeMouse: true,
  playwrightMouseJitter: 5,
  playwrightClickDelayMin: 50,
  playwrightClickDelayMax: 150,
  playwrightInputDelayMin: 20,
  playwrightInputDelayMax: 80,
  playwrightActionDelayMin: 500,
  playwrightActionDelayMax: 1500,
  playwrightProxyEnabled: false,
  playwrightProxyServer: '',
  playwrightProxyUsername: '',
  playwrightEmulateDevice: false,
  playwrightDeviceName: 'Desktop Chrome',
  playwrightPersonaId: null,
  traderaDefaultTemplateId: '',
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: 0,
  traderaApiAppKey: '',
  traderaApiPublicKey: '',
  traderaApiUserId: 0,
  traderaApiToken: '',
  traderaApiTokenUpdatedAt: null,
};

export const toDocumentIdCandidates = (id: string): Array<string | ObjectId> => {
  if (ObjectId.isValid(id) && id.length === 24) {
    return [id, new ObjectId(id)];
  }
  return [id];
};

export const toConnectionIdCandidates = (
  id: string
): { asStrings: string[]; asDocumentIds: Array<string | ObjectId> } => {
  const asDocumentIds = toDocumentIdCandidates(id);
  const asStrings = new Set<string>(
    asDocumentIds.map((candidate) =>
      candidate instanceof ObjectId ? candidate.toHexString() : String(candidate)
    )
  );
  return {
    asStrings: Array.from(asStrings),
    asDocumentIds,
  };
};

export const stripActiveTemplateScopesForConnection = (
  rawValue: string | null | undefined,
  connectionId: string
): string | null => {
  if (!rawValue) return rawValue ?? null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return rawValue;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return rawValue;
  }

  const record = parsed as Record<string, unknown>;
  const byScopeRaw = record['byScope'];
  if (!byScopeRaw || typeof byScopeRaw !== 'object' || Array.isArray(byScopeRaw)) {
    return rawValue;
  }

  const scopePrefix = `${connectionId}${ACTIVE_TEMPLATE_SCOPE_SEPARATOR}`;
  let changed = false;
  const nextByScope = Object.entries(byScopeRaw as Record<string, unknown>).reduce(
    (acc, [scopeKey, value]) => {
      if (scopeKey === connectionId || scopeKey.startsWith(scopePrefix)) {
        changed = true;
        return acc;
      }
      acc[scopeKey] = value;
      return acc;
    },
    {} as Record<string, unknown>
  );

  if (!changed) return rawValue;

  return JSON.stringify({
    ...record,
    byScope: nextByScope,
  });
};

export const withDependencyTotal = (
  counts: Omit<ConnectionDependencyCounts, 'total'>
): ConnectionDependencyCounts => {
  const total = Object.values(counts).reduce((acc, val) => acc + val, 0);
  return { ...counts, total };
};

export const normalizeOptionalConnectionId = (value?: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const remapProductSyncProfilesSetting = (
  rawValue: string | null | undefined,
  sourceConnectionId: string,
  replacementConnectionId: string | null
): string | null => {
  if (!rawValue) return rawValue ?? null;
  try {
    const profiles = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(profiles)) return rawValue;

    let changed = false;
    const nextProfiles = profiles
      .map((profile: unknown) => {
        if (
          profile &&
          typeof profile === 'object' &&
          !Array.isArray(profile) &&
          (profile as Record<string, unknown>)['connectionId'] === sourceConnectionId
        ) {
          changed = true;
          if (!replacementConnectionId) return null;
          return { ...(profile as Record<string, unknown>), connectionId: replacementConnectionId };
        }
        return profile;
      })
      .filter(Boolean);

    return changed ? JSON.stringify(nextProfiles) : rawValue;
  } catch {
    return rawValue;
  }
};

export const toIsoStringOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? value.toISOString() : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    const timestamp = parsed.getTime();
    return Number.isFinite(timestamp) ? parsed.toISOString() : null;
  }
  return null;
};

export const toRequiredIsoString = (value: unknown): string =>
  toIsoStringOrNull(value) ?? new Date(0).toISOString();

export const toIntegrationRecord = (doc: unknown): IntegrationRecord => {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Invalid integration document');
  }
  const d = doc as Record<string, unknown>;
  const rawId = d['id'] ?? d['_id'];
  const id =
    rawId && typeof rawId === 'object' && 'toString' in rawId
      ? rawId.toString()
      : String(rawId ?? '');

  return {
    id,
    name: String(d['name'] ?? ''),
    slug: String(d['slug'] ?? ''),
    createdAt: toRequiredIsoString(d['createdAt']),
    updatedAt: toIsoStringOrNull(d['updatedAt']),
  };
};

export const toConnectionRecord = (doc: unknown): IntegrationConnectionRecord => {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Invalid connection document');
  }
  const d = doc as Record<string, unknown>;
  const rawId = d['id'] ?? d['_id'];
  const id =
    rawId && typeof rawId === 'object' && 'toString' in rawId
      ? rawId.toString()
      : String(rawId ?? '');

  return {
    id,
    integrationId: String(d['integrationId'] ?? ''),
    name: String(d['name'] ?? ''),
    username: d['username'] ? String(d['username']) : undefined,
    password: d['password'] ? String(d['password']) : undefined,
    playwrightStorageState: (d['playwrightStorageState'] as string) ?? null,
    playwrightStorageStateUpdatedAt: toIsoStringOrNull(d['playwrightStorageStateUpdatedAt']),
    playwrightHeadless:
      (d['playwrightHeadless'] as boolean) ?? CONNECTION_DEFAULTS.playwrightHeadless,
    playwrightSlowMo: (d['playwrightSlowMo'] as number) ?? CONNECTION_DEFAULTS.playwrightSlowMo,
    playwrightTimeout: (d['playwrightTimeout'] as number) ?? CONNECTION_DEFAULTS.playwrightTimeout,
    playwrightNavigationTimeout:
      (d['playwrightNavigationTimeout'] as number) ??
      CONNECTION_DEFAULTS.playwrightNavigationTimeout,
    playwrightHumanizeMouse:
      (d['playwrightHumanizeMouse'] as boolean) ?? CONNECTION_DEFAULTS.playwrightHumanizeMouse,
    playwrightMouseJitter:
      (d['playwrightMouseJitter'] as number) ?? CONNECTION_DEFAULTS.playwrightMouseJitter,
    playwrightClickDelayMin:
      (d['playwrightClickDelayMin'] as number) ?? CONNECTION_DEFAULTS.playwrightClickDelayMin,
    playwrightClickDelayMax:
      (d['playwrightClickDelayMax'] as number) ?? CONNECTION_DEFAULTS.playwrightClickDelayMax,
    playwrightInputDelayMin:
      (d['playwrightInputDelayMin'] as number) ?? CONNECTION_DEFAULTS.playwrightInputDelayMin,
    playwrightInputDelayMax:
      (d['playwrightInputDelayMax'] as number) ?? CONNECTION_DEFAULTS.playwrightInputDelayMax,
    playwrightActionDelayMin:
      (d['playwrightActionDelayMin'] as number) ?? CONNECTION_DEFAULTS.playwrightActionDelayMin,
    playwrightActionDelayMax:
      (d['playwrightActionDelayMax'] as number) ?? CONNECTION_DEFAULTS.playwrightActionDelayMax,
    playwrightProxyEnabled:
      (d['playwrightProxyEnabled'] as boolean) ?? CONNECTION_DEFAULTS.playwrightProxyEnabled,
    playwrightProxyServer:
      (d['playwrightProxyServer'] as string) ?? CONNECTION_DEFAULTS.playwrightProxyServer,
    playwrightProxyUsername:
      (d['playwrightProxyUsername'] as string) ?? CONNECTION_DEFAULTS.playwrightProxyUsername,
    playwrightProxyPassword: (d['playwrightProxyPassword'] as string) ?? null,
    playwrightEmulateDevice:
      (d['playwrightEmulateDevice'] as boolean) ?? CONNECTION_DEFAULTS.playwrightEmulateDevice,
    playwrightDeviceName:
      (d['playwrightDeviceName'] as string) ?? CONNECTION_DEFAULTS.playwrightDeviceName,
    playwrightPersonaId:
      (d['playwrightPersonaId'] as string) ?? CONNECTION_DEFAULTS.playwrightPersonaId,
    allegroAccessToken: (d['allegroAccessToken'] as string) ?? null,
    allegroRefreshToken: (d['allegroRefreshToken'] as string) ?? null,
    allegroTokenType: (d['allegroTokenType'] as string) ?? null,
    allegroScope: (d['allegroScope'] as string) ?? null,
    allegroExpiresAt: toIsoStringOrNull(d['allegroExpiresAt']),
    allegroTokenUpdatedAt: toIsoStringOrNull(d['allegroTokenUpdatedAt']),
    allegroUseSandbox: (d['allegroUseSandbox'] as boolean) ?? false,
    baseApiToken: (d['baseApiToken'] as string) ?? null,
    baseTokenUpdatedAt: toIsoStringOrNull(d['baseTokenUpdatedAt']),
    baseLastInventoryId: (d['baseLastInventoryId'] as string) ?? null,
    traderaDefaultTemplateId:
      (d['traderaDefaultTemplateId'] as string) ?? CONNECTION_DEFAULTS.traderaDefaultTemplateId,
    traderaDefaultDurationHours:
      (d['traderaDefaultDurationHours'] as number) ??
      CONNECTION_DEFAULTS.traderaDefaultDurationHours,
    traderaAutoRelistEnabled:
      (d['traderaAutoRelistEnabled'] as boolean) ?? CONNECTION_DEFAULTS.traderaAutoRelistEnabled,
    traderaAutoRelistLeadMinutes:
      (d['traderaAutoRelistLeadMinutes'] as number) ??
      CONNECTION_DEFAULTS.traderaAutoRelistLeadMinutes,
    traderaApiAppId: (d['traderaApiAppId'] as number) ?? CONNECTION_DEFAULTS.traderaApiAppId,
    traderaApiAppKey: (d['traderaApiAppKey'] as string) ?? CONNECTION_DEFAULTS.traderaApiAppKey,
    traderaApiPublicKey:
      (d['traderaApiPublicKey'] as string) ?? CONNECTION_DEFAULTS.traderaApiPublicKey,
    traderaApiUserId: (d['traderaApiUserId'] as number) ?? CONNECTION_DEFAULTS.traderaApiUserId,
    traderaApiToken: (d['traderaApiToken'] as string) ?? CONNECTION_DEFAULTS.traderaApiToken,
    traderaApiTokenUpdatedAt: toIsoStringOrNull(d['traderaApiTokenUpdatedAt']),
    createdAt: toRequiredIsoString(d['createdAt']),
    updatedAt: toIsoStringOrNull(d['updatedAt']),
  };
};
