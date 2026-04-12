import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { is1688IntegrationSlug, isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import { encryptSecret } from '@/features/integrations/server';
import {
  assertValidTraderaPlaywrightListingScript,
} from '@/features/integrations/services/tradera-listing/script-validation';
import {
  normalizePersistedTraderaPlaywrightListingScript,
} from '@/features/integrations/services/tradera-listing/managed-script';
import {
  normalizeIntegrationPlaywrightPersonas,
  resolveIntegrationConnectionPlaywrightBrowserWithPersona,
  resolveIntegrationConnectionPlaywrightSettingsWithPersona,
} from '@/features/integrations/utils/playwright-connection-settings';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY, type PlaywrightPersona } from '@/shared/contracts/playwright';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const createConnectionSchema = z
  .object({
    name: z.string().trim().min(1),
    username: z.string().trim().optional(),
    password: z.string().trim().optional(),
    playwrightIdentityProfile: z.enum(['default', 'search', 'marketplace']).nullable().optional(),
    playwrightHeadless: z.boolean().optional(),
    playwrightSlowMo: z.number().int().min(0).optional(),
    playwrightTimeout: z.number().int().min(1000).optional(),
    playwrightNavigationTimeout: z.number().int().min(1000).optional(),
    playwrightLocale: z.string().trim().max(32).nullable().optional(),
    playwrightTimezoneId: z.string().trim().max(128).nullable().optional(),
    playwrightHumanizeMouse: z.boolean().optional(),
    playwrightMouseJitter: z.number().int().min(0).optional(),
    playwrightClickDelayMin: z.number().int().min(0).optional(),
    playwrightClickDelayMax: z.number().int().min(0).optional(),
    playwrightInputDelayMin: z.number().int().min(0).optional(),
    playwrightInputDelayMax: z.number().int().min(0).optional(),
    playwrightActionDelayMin: z.number().int().min(0).optional(),
    playwrightActionDelayMax: z.number().int().min(0).optional(),
    playwrightProxyEnabled: z.boolean().optional(),
    playwrightProxyServer: z.string().trim().nullable().optional(),
    playwrightProxyUsername: z.string().trim().nullable().optional(),
    playwrightProxyPassword: z.string().trim().nullable().optional(),
    playwrightBrowser: z.enum(['auto', 'brave', 'chrome', 'chromium']).nullable().optional(),
    playwrightEmulateDevice: z.boolean().optional(),
    playwrightDeviceName: z.string().trim().nullable().optional(),
    playwrightPersonaId: z.string().trim().nullable().optional(),
    traderaBrowserMode: z.enum(['builtin', 'scripted']).nullable().optional(),
    traderaCategoryStrategy: z.enum(['mapper', 'top_suggested']).nullable().optional(),
    playwrightListingScript: z.string().trim().nullable().optional(),
    playwrightImportScript: z.string().trim().nullable().optional(),
    playwrightImportBaseUrl: z.string().trim().nullable().optional(),
    playwrightImportCaptureRoutesJson: z.string().trim().nullable().optional(),
    playwrightFieldMapperJson: z.string().trim().nullable().optional(),
    traderaDefaultTemplateId: z.string().trim().nullable().optional(),
    traderaDefaultDurationHours: z.number().int().min(1).max(720).optional(),
    traderaAutoRelistEnabled: z.boolean().optional(),
    traderaAutoRelistLeadMinutes: z.number().int().min(0).max(10080).optional(),
    traderaApiAppId: z.number().int().positive().optional(),
    traderaApiAppKey: z.string().trim().min(1).optional(),
    traderaApiPublicKey: z.string().trim().nullable().optional(),
    traderaApiUserId: z.number().int().positive().optional(),
    traderaApiToken: z.string().trim().min(1).optional(),
    traderaApiSandbox: z.boolean().optional(),
    traderaParameterMapperRulesJson: z.string().trim().nullable().optional(),
    traderaParameterMapperCatalogJson: z.string().trim().nullable().optional(),
    scanner1688StartUrl: z.string().trim().max(4_000).nullable().optional(),
    scanner1688LoginMode: z.enum(['session_required', 'manual_login']).nullable().optional(),
    scanner1688DefaultSearchMode: z.enum(['local_image', 'image_url_fallback']).nullable().optional(),
    scanner1688CandidateResultLimit: z.number().int().positive().nullable().optional(),
    scanner1688MinimumCandidateScore: z.number().int().positive().nullable().optional(),
    scanner1688MaxExtractedImages: z.number().int().positive().nullable().optional(),
    scanner1688AllowUrlImageSearchFallback: z.boolean().nullable().optional(),
  })
  .strict();

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const loadPlaywrightPersonas = async (): Promise<PlaywrightPersona[]> =>
  normalizeIntegrationPlaywrightPersonas(
    parseJsonSetting(await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY), [])
  );

const serializePlaywrightConnectionSettings = (
  connection: Record<string, unknown>,
  playwrightPersonas: PlaywrightPersona[]
): Record<string, unknown> => {
  const settings = resolveIntegrationConnectionPlaywrightSettingsWithPersona(
    connection,
    playwrightPersonas
  );
  return {
    playwrightIdentityProfile: settings.identityProfile,
    playwrightHeadless: settings.headless,
    playwrightSlowMo: settings.slowMo,
    playwrightTimeout: settings.timeout,
    playwrightNavigationTimeout: settings.navigationTimeout,
    playwrightLocale: settings.locale,
    playwrightTimezoneId: settings.timezoneId,
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
    playwrightBrowser: resolveIntegrationConnectionPlaywrightBrowserWithPersona(
      connection,
      playwrightPersonas
    ),
    playwrightEmulateDevice: settings.emulateDevice,
    playwrightDeviceName: settings.deviceName,
  };
};

/**
 * GET /api/v2/integrations/[id]/connections
 * Fetch connections for an integration.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id: integrationId } = params;
  if (!integrationId) {
    throw badRequestError('Integration id is required');
  }

  const repo = await getIntegrationRepository();
  const connections = await repo.listConnections(integrationId);
  const playwrightPersonas = await loadPlaywrightPersonas();
  const payload = connections.map((connection: (typeof connections)[number]) => ({
    id: connection.id,
    integrationId: connection.integrationId,
    name: connection.name,
    username: connection.username,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,

    hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
    playwrightStorageStateUpdatedAt: connection.playwrightStorageStateUpdatedAt,
    hasAllegroAccessToken: Boolean(connection.allegroAccessToken),
    allegroTokenUpdatedAt: connection.allegroTokenUpdatedAt,
    allegroExpiresAt: connection.allegroExpiresAt,
    allegroScope: connection.allegroScope,
    allegroUseSandbox: connection.allegroUseSandbox ?? false,
    hasLinkedInAccessToken: Boolean(connection.linkedinAccessToken),
    linkedinTokenUpdatedAt: connection.linkedinTokenUpdatedAt ?? null,
    linkedinExpiresAt: connection.linkedinExpiresAt ?? null,
    linkedinScope: connection.linkedinScope ?? null,
    linkedinPersonUrn: connection.linkedinPersonUrn ?? null,
    linkedinProfileUrl: connection.linkedinProfileUrl ?? null,

    hasBaseApiToken: Boolean(connection.baseApiToken),
    baseTokenUpdatedAt: connection.baseTokenUpdatedAt,
    baseLastInventoryId: connection.baseLastInventoryId,

    ...serializePlaywrightConnectionSettings(connection, playwrightPersonas),
    playwrightProxyHasPassword: Boolean(connection.playwrightProxyPassword),
    playwrightPersonaId: connection.playwrightPersonaId ?? null,
    traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
    traderaCategoryStrategy: connection.traderaCategoryStrategy ?? 'mapper',
    playwrightListingScript: connection.playwrightListingScript ?? null,
    playwrightImportScript: connection.playwrightImportScript ?? null,
    playwrightImportBaseUrl: connection.playwrightImportBaseUrl ?? null,
    playwrightImportCaptureRoutesJson: connection.playwrightImportCaptureRoutesJson ?? null,
    playwrightFieldMapperJson: connection.playwrightFieldMapperJson ?? null,
    hasPlaywrightListingScript: Boolean(connection.playwrightListingScript?.trim()),
    traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
    traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
    traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
    traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
    traderaApiAppId: connection.traderaApiAppId ?? null,
    traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
    traderaApiUserId: connection.traderaApiUserId ?? null,
    traderaApiSandbox: connection.traderaApiSandbox ?? false,
    traderaParameterMapperRulesJson: connection.traderaParameterMapperRulesJson ?? null,
    traderaParameterMapperCatalogJson: connection.traderaParameterMapperCatalogJson ?? null,
    hasTraderaApiAppKey: Boolean(connection.traderaApiAppKey),
    hasTraderaApiToken: Boolean(connection.traderaApiToken),
    traderaApiTokenUpdatedAt: connection.traderaApiTokenUpdatedAt ?? null,
    scanner1688StartUrl: connection.scanner1688StartUrl ?? null,
    scanner1688LoginMode: connection.scanner1688LoginMode ?? null,
    scanner1688DefaultSearchMode: connection.scanner1688DefaultSearchMode ?? null,
    scanner1688CandidateResultLimit: connection.scanner1688CandidateResultLimit ?? null,
    scanner1688MinimumCandidateScore: connection.scanner1688MinimumCandidateScore ?? null,
    scanner1688MaxExtractedImages: connection.scanner1688MaxExtractedImages ?? null,
    scanner1688AllowUrlImageSearchFallback: connection.scanner1688AllowUrlImageSearchFallback ?? null,
  }));

  return NextResponse.json(payload);
}

/**
 * POST /api/v2/integrations/[id]/connections
 * Create a new connection for an integration.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id: integrationId } = params;
  if (!integrationId) {
    throw badRequestError('Integration id is required');
  }

  const parsed = await parseJsonBody(req, createConnectionSchema, {
    logPrefix: 'integrations.connections.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(integrationId);
  if (!integration) {
    throw notFoundError('Integration not found', { integrationId });
  }

  const integrationSlug = (integration.slug ?? '').trim().toLowerCase();
  const normalizedUsername = data.username?.trim() ?? '';
  const normalizedPassword = data.password?.trim() ?? '';
  const resolvedTraderaBrowserMode = data.traderaBrowserMode ?? 'builtin';
  const isBaseIntegration = BASE_INTEGRATION_SLUGS.has(integrationSlug);
  const isVintedIntegration = integrationSlug === 'vinted';
  const is1688Integration = is1688IntegrationSlug(integration.slug);
  const isPlaywrightProgrammableIntegration = isPlaywrightProgrammableSlug(integration.slug);
  const normalizedPlaywrightListingScript = normalizePersistedTraderaPlaywrightListingScript({
    integrationSlug: integration.slug,
    traderaBrowserMode: resolvedTraderaBrowserMode,
    playwrightListingScript:
      typeof data.playwrightListingScript === 'string'
        ? data.playwrightListingScript.trim() || null
        : data.playwrightListingScript ?? undefined,
  });
  if (
    integrationSlug !== 'baselinker' &&
    !isVintedIntegration &&
    !is1688Integration &&
    !isPlaywrightProgrammableIntegration &&
    !normalizedUsername
  ) {
    throw badRequestError('Username is required for this integration.', {
      integrationId,
      integrationSlug: integration.slug,
    });
  }
  if (!isVintedIntegration && !is1688Integration && !isPlaywrightProgrammableIntegration && !normalizedPassword) {
    throw badRequestError('Password/Token is required for this integration.', {
      integrationId,
      integrationSlug: integration.slug,
    });
  }

  assertValidTraderaPlaywrightListingScript({
    integrationSlug: integration.slug,
    traderaBrowserMode: resolvedTraderaBrowserMode,
    playwrightListingScript: normalizedPlaywrightListingScript,
  });

  const encryptedPassword = normalizedPassword ? encryptSecret(normalizedPassword) : null;

  const created = await repo.createConnection(integrationId, {
    name: data.name,
    ...(normalizedUsername || (!isVintedIntegration && !isPlaywrightProgrammableIntegration)
      ? { username: normalizedUsername }
      : {}),
    ...(encryptedPassword ? { password: encryptedPassword } : {}),
    ...(typeof data.playwrightBrowser === 'string' || data.playwrightBrowser === null
      ? { playwrightBrowser: data.playwrightBrowser ?? 'auto' }
      : {}),
    ...(typeof data.playwrightIdentityProfile === 'string' || data.playwrightIdentityProfile === null
      ? { playwrightIdentityProfile: data.playwrightIdentityProfile ?? 'default' }
      : {}),
    ...(typeof data.playwrightHeadless === 'boolean'
      ? { playwrightHeadless: data.playwrightHeadless }
      : {}),
    ...(typeof data.playwrightSlowMo === 'number'
      ? { playwrightSlowMo: data.playwrightSlowMo }
      : {}),
    ...(typeof data.playwrightTimeout === 'number'
      ? { playwrightTimeout: data.playwrightTimeout }
      : {}),
    ...(typeof data.playwrightNavigationTimeout === 'number'
      ? { playwrightNavigationTimeout: data.playwrightNavigationTimeout }
      : {}),
    ...(typeof data.playwrightLocale === 'string' || data.playwrightLocale === null
      ? { playwrightLocale: data.playwrightLocale ?? null }
      : {}),
    ...(typeof data.playwrightTimezoneId === 'string' || data.playwrightTimezoneId === null
      ? { playwrightTimezoneId: data.playwrightTimezoneId ?? null }
      : {}),
    ...(typeof data.playwrightHumanizeMouse === 'boolean'
      ? { playwrightHumanizeMouse: data.playwrightHumanizeMouse }
      : {}),
    ...(typeof data.playwrightMouseJitter === 'number'
      ? { playwrightMouseJitter: data.playwrightMouseJitter }
      : {}),
    ...(typeof data.playwrightClickDelayMin === 'number'
      ? { playwrightClickDelayMin: data.playwrightClickDelayMin }
      : {}),
    ...(typeof data.playwrightClickDelayMax === 'number'
      ? { playwrightClickDelayMax: data.playwrightClickDelayMax }
      : {}),
    ...(typeof data.playwrightInputDelayMin === 'number'
      ? { playwrightInputDelayMin: data.playwrightInputDelayMin }
      : {}),
    ...(typeof data.playwrightInputDelayMax === 'number'
      ? { playwrightInputDelayMax: data.playwrightInputDelayMax }
      : {}),
    ...(typeof data.playwrightActionDelayMin === 'number'
      ? { playwrightActionDelayMin: data.playwrightActionDelayMin }
      : {}),
    ...(typeof data.playwrightActionDelayMax === 'number'
      ? { playwrightActionDelayMax: data.playwrightActionDelayMax }
      : {}),
    ...(typeof data.playwrightProxyEnabled === 'boolean'
      ? { playwrightProxyEnabled: data.playwrightProxyEnabled }
      : {}),
    ...(typeof data.playwrightProxyServer === 'string' || data.playwrightProxyServer === null
      ? { playwrightProxyServer: data.playwrightProxyServer ?? null }
      : {}),
    ...(typeof data.playwrightProxyUsername === 'string' || data.playwrightProxyUsername === null
      ? { playwrightProxyUsername: data.playwrightProxyUsername ?? null }
      : {}),
    ...(typeof data.playwrightProxyPassword === 'string' && data.playwrightProxyPassword.trim()
      ? { playwrightProxyPassword: encryptSecret(data.playwrightProxyPassword.trim()) }
      : {}),
    ...(typeof data.playwrightEmulateDevice === 'boolean'
      ? { playwrightEmulateDevice: data.playwrightEmulateDevice }
      : {}),
    ...(typeof data.playwrightDeviceName === 'string' || data.playwrightDeviceName === null
      ? { playwrightDeviceName: data.playwrightDeviceName ?? null }
      : {}),
    ...(typeof data.playwrightPersonaId === 'string' || data.playwrightPersonaId === null
      ? { playwrightPersonaId: data.playwrightPersonaId ?? null }
      : {}),
    ...(isBaseIntegration && encryptedPassword
      ? {
        baseApiToken: encryptedPassword,
        baseTokenUpdatedAt: new Date().toISOString(),
      }
      : {}),
    ...(typeof data.traderaBrowserMode === 'string' || data.traderaBrowserMode === null
      ? { traderaBrowserMode: data.traderaBrowserMode ?? 'builtin' }
      : {}),
    ...(typeof data.traderaCategoryStrategy === 'string' || data.traderaCategoryStrategy === null
      ? { traderaCategoryStrategy: data.traderaCategoryStrategy ?? 'mapper' }
      : {}),
    ...(typeof normalizedPlaywrightListingScript === 'string' ||
    normalizedPlaywrightListingScript === null
      ? { playwrightListingScript: normalizedPlaywrightListingScript ?? null }
      : {}),
    ...(typeof data.playwrightImportScript === 'string' || data.playwrightImportScript === null
      ? { playwrightImportScript: data.playwrightImportScript ?? null }
      : {}),
    ...(typeof data.playwrightImportBaseUrl === 'string' || data.playwrightImportBaseUrl === null
      ? { playwrightImportBaseUrl: data.playwrightImportBaseUrl ?? null }
      : {}),
    ...(typeof data.playwrightImportCaptureRoutesJson === 'string' ||
    data.playwrightImportCaptureRoutesJson === null
      ? {
          playwrightImportCaptureRoutesJson: data.playwrightImportCaptureRoutesJson ?? null,
        }
      : {}),
    ...(typeof data.playwrightFieldMapperJson === 'string' || data.playwrightFieldMapperJson === null
      ? { playwrightFieldMapperJson: data.playwrightFieldMapperJson ?? null }
      : {}),
    ...(typeof data.traderaDefaultTemplateId === 'string' || data.traderaDefaultTemplateId === null
      ? { traderaDefaultTemplateId: data.traderaDefaultTemplateId ?? null }
      : {}),
    ...(typeof data.traderaDefaultDurationHours === 'number'
      ? { traderaDefaultDurationHours: data.traderaDefaultDurationHours }
      : {}),
    ...(typeof data.traderaAutoRelistEnabled === 'boolean'
      ? { traderaAutoRelistEnabled: data.traderaAutoRelistEnabled }
      : {}),
    ...(typeof data.traderaAutoRelistLeadMinutes === 'number'
      ? { traderaAutoRelistLeadMinutes: data.traderaAutoRelistLeadMinutes }
      : {}),
    ...(typeof data.traderaApiAppId === 'number' ? { traderaApiAppId: data.traderaApiAppId } : {}),
    ...(typeof data.traderaApiAppKey === 'string'
      ? { traderaApiAppKey: encryptSecret(data.traderaApiAppKey) }
      : {}),
    ...(typeof data.traderaApiPublicKey === 'string' || data.traderaApiPublicKey === null
      ? { traderaApiPublicKey: data.traderaApiPublicKey ?? null }
      : {}),
    ...(typeof data.traderaApiUserId === 'number'
      ? { traderaApiUserId: data.traderaApiUserId }
      : {}),
    ...(typeof data.traderaApiToken === 'string'
      ? {
        traderaApiToken: encryptSecret(data.traderaApiToken),
        traderaApiTokenUpdatedAt: new Date(),
      }
      : {}),
    ...(typeof data.traderaApiSandbox === 'boolean'
      ? { traderaApiSandbox: data.traderaApiSandbox }
      : {}),
    ...(typeof data.traderaParameterMapperRulesJson === 'string' ||
    data.traderaParameterMapperRulesJson === null
      ? {
          traderaParameterMapperRulesJson: data.traderaParameterMapperRulesJson ?? null,
        }
      : {}),
    ...(typeof data.traderaParameterMapperCatalogJson === 'string' ||
    data.traderaParameterMapperCatalogJson === null
      ? {
          traderaParameterMapperCatalogJson: data.traderaParameterMapperCatalogJson ?? null,
        }
      : {}),
    ...(typeof data.scanner1688StartUrl === 'string' || data.scanner1688StartUrl === null
      ? { scanner1688StartUrl: data.scanner1688StartUrl ?? null }
      : {}),
    ...(typeof data.scanner1688LoginMode === 'string' || data.scanner1688LoginMode === null
      ? { scanner1688LoginMode: data.scanner1688LoginMode ?? null }
      : {}),
    ...(typeof data.scanner1688DefaultSearchMode === 'string' || data.scanner1688DefaultSearchMode === null
      ? { scanner1688DefaultSearchMode: data.scanner1688DefaultSearchMode ?? null }
      : {}),
    ...(typeof data.scanner1688CandidateResultLimit === 'number' || data.scanner1688CandidateResultLimit === null
      ? { scanner1688CandidateResultLimit: data.scanner1688CandidateResultLimit ?? null }
      : {}),
    ...(typeof data.scanner1688MinimumCandidateScore === 'number' || data.scanner1688MinimumCandidateScore === null
      ? { scanner1688MinimumCandidateScore: data.scanner1688MinimumCandidateScore ?? null }
      : {}),
    ...(typeof data.scanner1688MaxExtractedImages === 'number' || data.scanner1688MaxExtractedImages === null
      ? { scanner1688MaxExtractedImages: data.scanner1688MaxExtractedImages ?? null }
      : {}),
    ...(typeof data.scanner1688AllowUrlImageSearchFallback === 'boolean' || data.scanner1688AllowUrlImageSearchFallback === null
      ? { scanner1688AllowUrlImageSearchFallback: data.scanner1688AllowUrlImageSearchFallback ?? null }
      : {}),
  });
  const playwrightPersonas = await loadPlaywrightPersonas();

  return NextResponse.json({
    id: created.id,
    integrationId: created.integrationId,
    name: created.name,
    username: created.username,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    hasPlaywrightStorageState: Boolean(created.playwrightStorageState),
    playwrightStorageStateUpdatedAt: created.playwrightStorageStateUpdatedAt,
    hasBaseApiToken: Boolean(created.baseApiToken),
    baseTokenUpdatedAt: created.baseTokenUpdatedAt,
    baseLastInventoryId: created.baseLastInventoryId,
    allegroUseSandbox: created.allegroUseSandbox ?? false,
    hasLinkedInAccessToken: Boolean(created.linkedinAccessToken),
    linkedinTokenUpdatedAt: created.linkedinTokenUpdatedAt ?? null,
    linkedinExpiresAt: created.linkedinExpiresAt ?? null,
    linkedinScope: created.linkedinScope ?? null,
    linkedinPersonUrn: created.linkedinPersonUrn ?? null,
    linkedinProfileUrl: created.linkedinProfileUrl ?? null,
    ...serializePlaywrightConnectionSettings(created, playwrightPersonas),
    playwrightProxyHasPassword: Boolean(created.playwrightProxyPassword),
    playwrightPersonaId: created.playwrightPersonaId ?? null,
    traderaBrowserMode: created.traderaBrowserMode ?? 'builtin',
    traderaCategoryStrategy: created.traderaCategoryStrategy ?? 'mapper',
    playwrightListingScript: created.playwrightListingScript ?? null,
    playwrightImportScript: created.playwrightImportScript ?? null,
    playwrightImportBaseUrl: created.playwrightImportBaseUrl ?? null,
    playwrightImportCaptureRoutesJson: created.playwrightImportCaptureRoutesJson ?? null,
    playwrightFieldMapperJson: created.playwrightFieldMapperJson ?? null,
    hasPlaywrightListingScript: Boolean(created.playwrightListingScript?.trim()),
    traderaDefaultTemplateId: created.traderaDefaultTemplateId ?? null,
    traderaDefaultDurationHours: created.traderaDefaultDurationHours ?? 72,
    traderaAutoRelistEnabled: created.traderaAutoRelistEnabled ?? true,
    traderaAutoRelistLeadMinutes: created.traderaAutoRelistLeadMinutes ?? 180,
    traderaApiAppId: created.traderaApiAppId ?? null,
    traderaApiPublicKey: created.traderaApiPublicKey ?? null,
    traderaApiUserId: created.traderaApiUserId ?? null,
    traderaApiSandbox: created.traderaApiSandbox ?? false,
    traderaParameterMapperRulesJson: created.traderaParameterMapperRulesJson ?? null,
    traderaParameterMapperCatalogJson: created.traderaParameterMapperCatalogJson ?? null,
    hasTraderaApiAppKey: Boolean(created.traderaApiAppKey),
    hasTraderaApiToken: Boolean(created.traderaApiToken),
    traderaApiTokenUpdatedAt: created.traderaApiTokenUpdatedAt ?? null,
    scanner1688StartUrl: created.scanner1688StartUrl ?? null,
    scanner1688LoginMode: created.scanner1688LoginMode ?? null,
    scanner1688DefaultSearchMode: created.scanner1688DefaultSearchMode ?? null,
    scanner1688CandidateResultLimit: created.scanner1688CandidateResultLimit ?? null,
    scanner1688MinimumCandidateScore: created.scanner1688MinimumCandidateScore ?? null,
    scanner1688MaxExtractedImages: created.scanner1688MaxExtractedImages ?? null,
    scanner1688AllowUrlImageSearchFallback: created.scanner1688AllowUrlImageSearchFallback ?? null,
  });
}
