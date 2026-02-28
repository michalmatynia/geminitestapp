import { Prisma } from '@prisma/client';
import { ObjectId, type WithId } from 'mongodb';
import {
  IntegrationRecord,
  IntegrationConnectionRecord,
} from '../types/integrations';

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

export type ConnectionDeleteOptions = {
  replacementConnectionId?: string | null | undefined;
};

export type ConnectionDependencyCounts = {
  productListings: number;
  categoryMappings: number;
  externalCategories: number;
  producerMappings: number;
  externalProducers: number;
  tagMappings: number;
  externalTags: number;
  total: number;
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
    const profiles = JSON.parse(rawValue);
    if (!Array.isArray(profiles)) return rawValue;

    let changed = false;
    const nextProfiles = profiles
      .map((profile: any) => {
        if (profile.connectionId === sourceConnectionId) {
          changed = true;
          if (!replacementConnectionId) return null;
          return { ...profile, connectionId: replacementConnectionId };
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

export const toIntegrationRecord = (
  doc: any
): IntegrationRecord => ({
  id: 'id' in doc ? doc.id : doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  createdAt: toRequiredIsoString(doc.createdAt),
  updatedAt: toIsoStringOrNull(doc.updatedAt),
});

export const toConnectionRecord = (
  doc: any
): IntegrationConnectionRecord => {
  const isPrisma = 'id' in doc;
  return {
    id: isPrisma ? doc.id : doc._id.toString(),
    integrationId: doc.integrationId,
    name: doc.name,
    username: doc.username,
    password: doc.password,
    playwrightStorageState: doc.playwrightStorageState ?? null,
    playwrightStorageStateUpdatedAt: toIsoStringOrNull(doc.playwrightStorageStateUpdatedAt),
    playwrightHeadless: doc.playwrightHeadless ?? CONNECTION_DEFAULTS.playwrightHeadless,
    playwrightSlowMo: doc.playwrightSlowMo ?? CONNECTION_DEFAULTS.playwrightSlowMo,
    playwrightTimeout: doc.playwrightTimeout ?? CONNECTION_DEFAULTS.playwrightTimeout,
    playwrightNavigationTimeout:
      doc.playwrightNavigationTimeout ?? CONNECTION_DEFAULTS.playwrightNavigationTimeout,
    playwrightHumanizeMouse:
      doc.playwrightHumanizeMouse ?? CONNECTION_DEFAULTS.playwrightHumanizeMouse,
    playwrightMouseJitter: doc.playwrightMouseJitter ?? CONNECTION_DEFAULTS.playwrightMouseJitter,
    playwrightClickDelayMin:
      doc.playwrightClickDelayMin ?? CONNECTION_DEFAULTS.playwrightClickDelayMin,
    playwrightClickDelayMax:
      doc.playwrightClickDelayMax ?? CONNECTION_DEFAULTS.playwrightClickDelayMax,
    playwrightInputDelayMin:
      doc.playwrightInputDelayMin ?? CONNECTION_DEFAULTS.playwrightInputDelayMin,
    playwrightInputDelayMax:
      doc.playwrightInputDelayMax ?? CONNECTION_DEFAULTS.playwrightInputDelayMax,
    playwrightActionDelayMin:
      doc.playwrightActionDelayMin ?? CONNECTION_DEFAULTS.playwrightActionDelayMin,
    playwrightActionDelayMax:
      doc.playwrightActionDelayMax ?? CONNECTION_DEFAULTS.playwrightActionDelayMax,
    playwrightProxyEnabled:
      doc.playwrightProxyEnabled ?? CONNECTION_DEFAULTS.playwrightProxyEnabled,
    playwrightProxyServer: doc.playwrightProxyServer ?? CONNECTION_DEFAULTS.playwrightProxyServer,
    playwrightProxyUsername:
      doc.playwrightProxyUsername ?? CONNECTION_DEFAULTS.playwrightProxyUsername,
    playwrightProxyPassword: doc.playwrightProxyPassword ?? null,
    playwrightEmulateDevice:
      doc.playwrightEmulateDevice ?? CONNECTION_DEFAULTS.playwrightEmulateDevice,
    playwrightDeviceName: doc.playwrightDeviceName ?? CONNECTION_DEFAULTS.playwrightDeviceName,
    playwrightPersonaId: doc.playwrightPersonaId ?? CONNECTION_DEFAULTS.playwrightPersonaId,
    allegroAccessToken: doc.allegroAccessToken ?? null,
    allegroRefreshToken: doc.allegroRefreshToken ?? null,
    allegroTokenType: doc.allegroTokenType ?? null,
    allegroScope: doc.allegroScope ?? null,
    allegroExpiresAt: toIsoStringOrNull(doc.allegroExpiresAt),
    allegroTokenUpdatedAt: toIsoStringOrNull(doc.allegroTokenUpdatedAt),
    allegroUseSandbox: doc.allegroUseSandbox ?? false,
    baseApiToken: doc.baseApiToken ?? null,
    baseTokenUpdatedAt: toIsoStringOrNull(doc.baseTokenUpdatedAt),
    baseLastInventoryId: doc.baseLastInventoryId ?? null,
    traderaDefaultTemplateId:
      doc.traderaDefaultTemplateId ?? CONNECTION_DEFAULTS.traderaDefaultTemplateId,
    traderaDefaultDurationHours:
      doc.traderaDefaultDurationHours ?? CONNECTION_DEFAULTS.traderaDefaultDurationHours,
    traderaAutoRelistEnabled:
      doc.traderaAutoRelistEnabled ?? CONNECTION_DEFAULTS.traderaAutoRelistEnabled,
    traderaAutoRelistLeadMinutes:
      doc.traderaAutoRelistLeadMinutes ?? CONNECTION_DEFAULTS.traderaAutoRelistLeadMinutes,
    traderaApiAppId: doc.traderaApiAppId ?? CONNECTION_DEFAULTS.traderaApiAppId,
    traderaApiAppKey: doc.traderaApiAppKey ?? CONNECTION_DEFAULTS.traderaApiAppKey,
    traderaApiPublicKey: doc.traderaApiPublicKey ?? CONNECTION_DEFAULTS.traderaApiPublicKey,
    traderaApiUserId: doc.traderaApiUserId ?? CONNECTION_DEFAULTS.traderaApiUserId,
    traderaApiToken: doc.traderaApiToken ?? CONNECTION_DEFAULTS.traderaApiToken,
    traderaApiTokenUpdatedAt: toIsoStringOrNull(doc.traderaApiTokenUpdatedAt),
    createdAt: toRequiredIsoString(doc.createdAt),
    updatedAt: toIsoStringOrNull(doc.updatedAt),
  };
};
