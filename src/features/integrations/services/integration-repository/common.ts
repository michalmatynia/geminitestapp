import { ObjectId } from 'mongodb';

import { IntegrationRecord, IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { ConnectionDeleteOptions, ConnectionDependencyCounts } from '@/shared/contracts/integrations/connections';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  defaultIntegrationConnectionPlaywrightSettings,
} from '@/features/integrations/utils/playwright-connection-settings';


export type { ConnectionDeleteOptions, ConnectionDependencyCounts };

export const INTEGRATION_COLLECTION = 'integrations';
export const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
export const DEFAULT_CONNECTION_SETTING_KEY = 'base_export_default_connection_id';
export const DEFAULT_1688_CONNECTION_SETTING_KEY = 'scanner_1688_default_connection_id';
export const PRODUCT_SYNC_PROFILE_SETTINGS_KEY = 'product_sync_profiles';
export const ACTIVE_TEMPLATE_SETTING_KEY = 'base_export_active_template_id';
export const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';

export const CONNECTION_DEFAULTS = {
  traderaBrowserMode: 'builtin' as const,
  playwrightBrowser: DEFAULT_INTEGRATION_CONNECTION_PLAYWRIGHT_BROWSER,
  playwrightIdentityProfile: defaultIntegrationConnectionPlaywrightSettings.identityProfile,
  playwrightHeadless: defaultIntegrationConnectionPlaywrightSettings.headless,
  playwrightSlowMo: defaultIntegrationConnectionPlaywrightSettings.slowMo,
  playwrightTimeout: defaultIntegrationConnectionPlaywrightSettings.timeout,
  playwrightNavigationTimeout: defaultIntegrationConnectionPlaywrightSettings.navigationTimeout,
  playwrightLocale: defaultIntegrationConnectionPlaywrightSettings.locale,
  playwrightTimezoneId: defaultIntegrationConnectionPlaywrightSettings.timezoneId,
  playwrightHumanizeMouse: defaultIntegrationConnectionPlaywrightSettings.humanizeMouse,
  playwrightMouseJitter: defaultIntegrationConnectionPlaywrightSettings.mouseJitter,
  playwrightClickDelayMin: defaultIntegrationConnectionPlaywrightSettings.clickDelayMin,
  playwrightClickDelayMax: defaultIntegrationConnectionPlaywrightSettings.clickDelayMax,
  playwrightInputDelayMin: defaultIntegrationConnectionPlaywrightSettings.inputDelayMin,
  playwrightInputDelayMax: defaultIntegrationConnectionPlaywrightSettings.inputDelayMax,
  playwrightActionDelayMin: defaultIntegrationConnectionPlaywrightSettings.actionDelayMin,
  playwrightActionDelayMax: defaultIntegrationConnectionPlaywrightSettings.actionDelayMax,
  playwrightProxyEnabled: defaultIntegrationConnectionPlaywrightSettings.proxyEnabled,
  playwrightProxyServer: defaultIntegrationConnectionPlaywrightSettings.proxyServer,
  playwrightProxyUsername: defaultIntegrationConnectionPlaywrightSettings.proxyUsername,
  playwrightProxySessionAffinity:
    defaultIntegrationConnectionPlaywrightSettings.proxySessionAffinity,
  playwrightProxySessionMode:
    defaultIntegrationConnectionPlaywrightSettings.proxySessionMode,
  playwrightProxyProviderPreset:
    defaultIntegrationConnectionPlaywrightSettings.proxyProviderPreset,
  playwrightEmulateDevice: false,
  playwrightDeviceName: defaultIntegrationConnectionPlaywrightSettings.deviceName,
  playwrightPersonaId: null,
  playwrightListingScript: null,
  playwrightImportScript: null,
  playwrightImportBaseUrl: null,
  playwrightImportCaptureRoutesJson: null,
  playwrightFieldMapperJson: null,
  scanner1688StartUrl: 'https://www.1688.com/',
  scanner1688LoginMode: 'session_required' as const,
  scanner1688DefaultSearchMode: 'local_image' as const,
  scanner1688CandidateResultLimit: null,
  scanner1688MinimumCandidateScore: null,
  scanner1688MaxExtractedImages: null,
  scanner1688AllowUrlImageSearchFallback: false,
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
  traderaParameterMapperRulesJson: null,
  traderaParameterMapperCatalogJson: null,
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
  } catch (error) {
    logClientError(error);
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
  } catch (error) {
    logClientError(error);
    return rawValue;
  }
};

const isValidDate = (value: Date): boolean => Number.isFinite(value.getTime());

const resolveDateLikeValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : null;
  }

  return null;
};

export const toIsoStringOrNull = (value: unknown): string | null =>
  resolveDateLikeValue(value)?.toISOString() ?? null;

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
      typeof d['playwrightHeadless'] === 'boolean' ? d['playwrightHeadless'] : undefined,
    playwrightSlowMo:
      typeof d['playwrightSlowMo'] === 'number' ? d['playwrightSlowMo'] : undefined,
    playwrightTimeout:
      typeof d['playwrightTimeout'] === 'number' ? d['playwrightTimeout'] : undefined,
    playwrightNavigationTimeout:
      typeof d['playwrightNavigationTimeout'] === 'number'
        ? d['playwrightNavigationTimeout']
        : undefined,
    playwrightLocale:
      typeof d['playwrightLocale'] === 'string' ? d['playwrightLocale'] : undefined,
    playwrightTimezoneId:
      typeof d['playwrightTimezoneId'] === 'string' ? d['playwrightTimezoneId'] : undefined,
    playwrightHumanizeMouse:
      typeof d['playwrightHumanizeMouse'] === 'boolean'
        ? d['playwrightHumanizeMouse']
        : undefined,
    playwrightMouseJitter:
      typeof d['playwrightMouseJitter'] === 'number'
        ? d['playwrightMouseJitter']
        : undefined,
    playwrightClickDelayMin:
      typeof d['playwrightClickDelayMin'] === 'number'
        ? d['playwrightClickDelayMin']
        : undefined,
    playwrightClickDelayMax:
      typeof d['playwrightClickDelayMax'] === 'number'
        ? d['playwrightClickDelayMax']
        : undefined,
    playwrightInputDelayMin:
      typeof d['playwrightInputDelayMin'] === 'number'
        ? d['playwrightInputDelayMin']
        : undefined,
    playwrightInputDelayMax:
      typeof d['playwrightInputDelayMax'] === 'number'
        ? d['playwrightInputDelayMax']
        : undefined,
    playwrightActionDelayMin:
      typeof d['playwrightActionDelayMin'] === 'number'
        ? d['playwrightActionDelayMin']
        : undefined,
    playwrightActionDelayMax:
      typeof d['playwrightActionDelayMax'] === 'number'
        ? d['playwrightActionDelayMax']
        : undefined,
    playwrightProxyEnabled:
      typeof d['playwrightProxyEnabled'] === 'boolean'
        ? d['playwrightProxyEnabled']
        : undefined,
    playwrightProxyServer:
      typeof d['playwrightProxyServer'] === 'string'
        ? d['playwrightProxyServer']
        : undefined,
    playwrightProxyUsername:
      typeof d['playwrightProxyUsername'] === 'string'
        ? d['playwrightProxyUsername']
        : undefined,
    playwrightProxyPassword: (d['playwrightProxyPassword'] as string) ?? null,
    playwrightProxySessionAffinity:
      typeof d['playwrightProxySessionAffinity'] === 'boolean'
        ? d['playwrightProxySessionAffinity']
        : undefined,
    playwrightProxySessionMode:
      d['playwrightProxySessionMode'] === 'sticky' ||
      d['playwrightProxySessionMode'] === 'rotate'
        ? d['playwrightProxySessionMode']
        : undefined,
    playwrightProxyProviderPreset:
      d['playwrightProxyProviderPreset'] === 'custom' ||
      d['playwrightProxyProviderPreset'] === 'brightdata' ||
      d['playwrightProxyProviderPreset'] === 'oxylabs' ||
      d['playwrightProxyProviderPreset'] === 'decodo'
        ? d['playwrightProxyProviderPreset']
        : undefined,
    playwrightBrowser:
      d['playwrightBrowser'] === 'auto' ||
      d['playwrightBrowser'] === 'brave' ||
      d['playwrightBrowser'] === 'chrome' ||
      d['playwrightBrowser'] === 'chromium'
        ? d['playwrightBrowser']
        : undefined,
    playwrightIdentityProfile:
      d['playwrightIdentityProfile'] === 'default' ||
      d['playwrightIdentityProfile'] === 'search' ||
      d['playwrightIdentityProfile'] === 'marketplace'
        ? d['playwrightIdentityProfile']
        : undefined,
    playwrightEmulateDevice:
      typeof d['playwrightEmulateDevice'] === 'boolean'
        ? d['playwrightEmulateDevice']
        : undefined,
    playwrightDeviceName:
      typeof d['playwrightDeviceName'] === 'string'
        ? d['playwrightDeviceName']
        : undefined,
    playwrightPersonaId:
      (d['playwrightPersonaId'] as string) ?? CONNECTION_DEFAULTS.playwrightPersonaId,
    playwrightListingScript:
      (d['playwrightListingScript'] as string) ?? CONNECTION_DEFAULTS.playwrightListingScript,
    playwrightImportScript:
      (d['playwrightImportScript'] as string) ?? CONNECTION_DEFAULTS.playwrightImportScript,
    playwrightImportBaseUrl:
      (d['playwrightImportBaseUrl'] as string) ?? CONNECTION_DEFAULTS.playwrightImportBaseUrl,
    playwrightImportCaptureRoutesJson:
      (d['playwrightImportCaptureRoutesJson'] as string) ??
      CONNECTION_DEFAULTS.playwrightImportCaptureRoutesJson,
    playwrightFieldMapperJson:
      (d['playwrightFieldMapperJson'] as string) ??
      CONNECTION_DEFAULTS.playwrightFieldMapperJson,
    scanner1688StartUrl:
      (d['scanner1688StartUrl'] as string) ?? CONNECTION_DEFAULTS.scanner1688StartUrl,
    scanner1688LoginMode:
      d['scanner1688LoginMode'] === 'manual_login'
        ? 'manual_login'
        : CONNECTION_DEFAULTS.scanner1688LoginMode,
    scanner1688DefaultSearchMode:
      d['scanner1688DefaultSearchMode'] === 'image_url_fallback'
        ? 'image_url_fallback'
        : CONNECTION_DEFAULTS.scanner1688DefaultSearchMode,
    scanner1688CandidateResultLimit:
      typeof d['scanner1688CandidateResultLimit'] === 'number'
        ? (d['scanner1688CandidateResultLimit'] as number)
        : CONNECTION_DEFAULTS.scanner1688CandidateResultLimit,
    scanner1688MinimumCandidateScore:
      typeof d['scanner1688MinimumCandidateScore'] === 'number'
        ? (d['scanner1688MinimumCandidateScore'] as number)
        : CONNECTION_DEFAULTS.scanner1688MinimumCandidateScore,
    scanner1688MaxExtractedImages:
      typeof d['scanner1688MaxExtractedImages'] === 'number'
        ? (d['scanner1688MaxExtractedImages'] as number)
        : CONNECTION_DEFAULTS.scanner1688MaxExtractedImages,
    scanner1688AllowUrlImageSearchFallback:
      typeof d['scanner1688AllowUrlImageSearchFallback'] === 'boolean'
        ? (d['scanner1688AllowUrlImageSearchFallback'] as boolean)
        : CONNECTION_DEFAULTS.scanner1688AllowUrlImageSearchFallback,
    allegroAccessToken: (d['allegroAccessToken'] as string) ?? null,
    allegroRefreshToken: (d['allegroRefreshToken'] as string) ?? null,
    allegroTokenType: (d['allegroTokenType'] as string) ?? null,
    allegroScope: (d['allegroScope'] as string) ?? null,
    allegroExpiresAt: toIsoStringOrNull(d['allegroExpiresAt']),
    allegroTokenUpdatedAt: toIsoStringOrNull(d['allegroTokenUpdatedAt']),
    allegroUseSandbox: (d['allegroUseSandbox'] as boolean) ?? false,
    linkedinAccessToken: (d['linkedinAccessToken'] as string) ?? null,
    linkedinRefreshToken: (d['linkedinRefreshToken'] as string) ?? null,
    linkedinTokenType: (d['linkedinTokenType'] as string) ?? null,
    linkedinScope: (d['linkedinScope'] as string) ?? null,
    linkedinExpiresAt: toIsoStringOrNull(d['linkedinExpiresAt']),
    linkedinTokenUpdatedAt: toIsoStringOrNull(d['linkedinTokenUpdatedAt']),
    linkedinPersonUrn: (d['linkedinPersonUrn'] as string) ?? null,
    linkedinProfileUrl: (d['linkedinProfileUrl'] as string) ?? null,
    baseApiToken: (d['baseApiToken'] as string) ?? null,
    baseTokenUpdatedAt: toIsoStringOrNull(d['baseTokenUpdatedAt']),
    baseLastInventoryId: (d['baseLastInventoryId'] as string) ?? null,
    traderaBrowserMode:
      d['traderaBrowserMode'] === 'scripted' ? 'scripted' : CONNECTION_DEFAULTS.traderaBrowserMode,
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
    traderaParameterMapperRulesJson:
      (d['traderaParameterMapperRulesJson'] as string) ??
      CONNECTION_DEFAULTS.traderaParameterMapperRulesJson,
    traderaParameterMapperCatalogJson:
      (d['traderaParameterMapperCatalogJson'] as string) ??
      CONNECTION_DEFAULTS.traderaParameterMapperCatalogJson,
    createdAt: toRequiredIsoString(d['createdAt']),
    updatedAt: toIsoStringOrNull(d['updatedAt']),
  };
};
