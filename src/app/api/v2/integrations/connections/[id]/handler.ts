import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth, findAuthUserById } from '@/features/auth/server';
import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
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
import { authError, badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const connectionSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().optional(),
  password: z.string().trim().optional(),
  playwrightIdentityProfile: z.enum(['default', 'search', 'marketplace']).nullable().optional(),
  playwrightHeadless: z.boolean().nullable().optional(),
  playwrightSlowMo: z.number().int().min(0).nullable().optional(),
  playwrightTimeout: z.number().int().min(1000).nullable().optional(),
  playwrightNavigationTimeout: z.number().int().min(1000).nullable().optional(),
  playwrightLocale: z.string().trim().max(32).nullable().optional(),
  playwrightTimezoneId: z.string().trim().max(128).nullable().optional(),
  playwrightHumanizeMouse: z.boolean().nullable().optional(),
  playwrightMouseJitter: z.number().int().min(0).nullable().optional(),
  playwrightClickDelayMin: z.number().int().min(0).nullable().optional(),
  playwrightClickDelayMax: z.number().int().min(0).nullable().optional(),
  playwrightInputDelayMin: z.number().int().min(0).nullable().optional(),
  playwrightInputDelayMax: z.number().int().min(0).nullable().optional(),
  playwrightActionDelayMin: z.number().int().min(0).nullable().optional(),
  playwrightActionDelayMax: z.number().int().min(0).nullable().optional(),
  playwrightProxyEnabled: z.boolean().nullable().optional(),
  playwrightProxyServer: z.string().nullable().optional(),
  playwrightProxyUsername: z.string().nullable().optional(),
  playwrightProxyPassword: z.string().nullable().optional(),
  playwrightBrowser: z.enum(['auto', 'brave', 'chrome', 'chromium']).nullable().optional(),
  playwrightEmulateDevice: z.boolean().nullable().optional(),
  playwrightDeviceName: z.string().nullable().optional(),
  playwrightPersonaId: z.string().trim().nullable().optional(),
  traderaBrowserMode: z.enum(['builtin', 'scripted']).nullable().optional(),
  traderaCategoryStrategy: z.enum(['mapper', 'top_suggested']).nullable().optional(),
  playwrightListingScript: z.string().nullable().optional(),
  playwrightImportScript: z.string().nullable().optional(),
  playwrightImportBaseUrl: z.string().nullable().optional(),
  playwrightImportCaptureRoutesJson: z.string().nullable().optional(),
  playwrightFieldMapperJson: z.string().nullable().optional(),
  resetPlaywrightOverrides: z.boolean().optional(),
  allegroUseSandbox: z.boolean().optional(),
  traderaDefaultTemplateId: z.string().trim().nullable().optional(),
  traderaDefaultDurationHours: z.number().int().min(1).max(720).optional(),
  traderaAutoRelistEnabled: z.boolean().optional(),
  traderaAutoRelistLeadMinutes: z.number().int().min(0).max(10080).optional(),
  traderaApiAppId: z.number().int().positive().optional(),
  traderaApiAppKey: z.string().trim().optional(),
  traderaApiPublicKey: z.string().trim().nullable().optional(),
  traderaApiUserId: z.number().int().positive().optional(),
  traderaApiToken: z.string().trim().optional(),
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
});

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
const PLAYWRIGHT_OVERRIDE_RESET_VALUES = {
  playwrightIdentityProfile: null,
  playwrightHeadless: null,
  playwrightSlowMo: null,
  playwrightTimeout: null,
  playwrightNavigationTimeout: null,
  playwrightLocale: null,
  playwrightTimezoneId: null,
  playwrightHumanizeMouse: null,
  playwrightMouseJitter: null,
  playwrightClickDelayMin: null,
  playwrightClickDelayMax: null,
  playwrightInputDelayMin: null,
  playwrightInputDelayMax: null,
  playwrightActionDelayMin: null,
  playwrightActionDelayMax: null,
  playwrightProxyEnabled: null,
  playwrightProxyServer: null,
  playwrightProxyUsername: null,
  playwrightProxyPassword: null,
  playwrightEmulateDevice: null,
  playwrightDeviceName: null,
} as const;

const deleteConnectionSchema = z.object({
  userPassword: z.string().trim().min(1),
});

export const deleteQuerySchema = z.object({
  replacementConnectionId: optionalTrimmedQueryString(),
});

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
 * PUT /api/v2/integrations/connections/[id]
 * Updates an integration connection.
 */
export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Connection id is required');
  }

  const parsed = await parseJsonBody(req, connectionSchema, {
    logPrefix: 'integrations.connection.PUT',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const repo = await getIntegrationRepository();
  const existingConnection = await repo.getConnectionById(id);
  const integration = existingConnection
    ? await repo.getIntegrationById(existingConnection.integrationId)
    : null;
  const normalizedUsername = data.username?.trim();
  const normalizedPassword = data.password?.trim();
  const resolvedTraderaBrowserMode =
    data.traderaBrowserMode ?? existingConnection?.traderaBrowserMode ?? 'builtin';
  const normalizedPlaywrightListingScript = normalizePersistedTraderaPlaywrightListingScript({
    integrationSlug: integration?.slug,
    traderaBrowserMode: resolvedTraderaBrowserMode,
    playwrightListingScript:
      typeof data.playwrightListingScript === 'string'
        ? data.playwrightListingScript.trim() || null
        : data.playwrightListingScript ?? undefined,
  });
  const isBaseIntegration = Boolean(
    integration && BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );
  const isVintedIntegration = Boolean(
    integration && (integration.slug ?? '').trim().toLowerCase() === 'vinted'
  );
  const isPlaywrightProgrammableIntegration = Boolean(
    integration && isPlaywrightProgrammableSlug(integration.slug)
  );

  if (
    integration &&
    integration.slug !== 'baselinker' &&
    !isVintedIntegration &&
    !isPlaywrightProgrammableIntegration &&
    typeof normalizedUsername === 'string' &&
    !normalizedUsername
  ) {
    throw badRequestError('Username is required for this integration.', {
      connectionId: id,
      integrationId: integration.id,
      integrationSlug: integration.slug,
    });
  }

  assertValidTraderaPlaywrightListingScript({
    integrationSlug: integration?.slug,
    traderaBrowserMode: resolvedTraderaBrowserMode,
    playwrightListingScript: normalizedPlaywrightListingScript,
  });

  const connection = await repo.updateConnection(id, {
    name: data.name,
    ...(typeof normalizedUsername === 'string' ? { username: normalizedUsername } : {}),
    ...(typeof normalizedPassword === 'string' && normalizedPassword
      ? (() => {
        const encryptedPassword = encryptSecret(normalizedPassword);
        return {
          password: encryptedPassword,
          ...(isBaseIntegration
            ? {
              baseApiToken: encryptedPassword,
              baseTokenUpdatedAt: new Date().toISOString(),
            }
            : {}),
        };
      })()
      : {}),
    ...(data.resetPlaywrightOverrides ? PLAYWRIGHT_OVERRIDE_RESET_VALUES : {}),

    ...(typeof data.playwrightHeadless === 'boolean' || data.playwrightHeadless === null
      ? { playwrightHeadless: data.playwrightHeadless ?? null }
      : {}),
    ...(typeof data.playwrightSlowMo === 'number' || data.playwrightSlowMo === null
      ? { playwrightSlowMo: data.playwrightSlowMo ?? null }
      : {}),
    ...(typeof data.playwrightTimeout === 'number' || data.playwrightTimeout === null
      ? { playwrightTimeout: data.playwrightTimeout ?? null }
      : {}),
    ...(typeof data.playwrightNavigationTimeout === 'number' ||
    data.playwrightNavigationTimeout === null
      ? { playwrightNavigationTimeout: data.playwrightNavigationTimeout ?? null }
      : {}),
    ...(typeof data.playwrightLocale === 'string' || data.playwrightLocale === null
      ? { playwrightLocale: data.playwrightLocale ?? null }
      : {}),
    ...(typeof data.playwrightTimezoneId === 'string' || data.playwrightTimezoneId === null
      ? { playwrightTimezoneId: data.playwrightTimezoneId ?? null }
      : {}),
    ...(typeof data.playwrightHumanizeMouse === 'boolean' || data.playwrightHumanizeMouse === null
      ? { playwrightHumanizeMouse: data.playwrightHumanizeMouse ?? null }
      : {}),
    ...(typeof data.playwrightMouseJitter === 'number' || data.playwrightMouseJitter === null
      ? { playwrightMouseJitter: data.playwrightMouseJitter ?? null }
      : {}),
    ...(typeof data.playwrightClickDelayMin === 'number' || data.playwrightClickDelayMin === null
      ? { playwrightClickDelayMin: data.playwrightClickDelayMin ?? null }
      : {}),
    ...(typeof data.playwrightClickDelayMax === 'number' || data.playwrightClickDelayMax === null
      ? { playwrightClickDelayMax: data.playwrightClickDelayMax ?? null }
      : {}),
    ...(typeof data.playwrightInputDelayMin === 'number' || data.playwrightInputDelayMin === null
      ? { playwrightInputDelayMin: data.playwrightInputDelayMin ?? null }
      : {}),
    ...(typeof data.playwrightInputDelayMax === 'number' || data.playwrightInputDelayMax === null
      ? { playwrightInputDelayMax: data.playwrightInputDelayMax ?? null }
      : {}),
    ...(typeof data.playwrightActionDelayMin === 'number' || data.playwrightActionDelayMin === null
      ? { playwrightActionDelayMin: data.playwrightActionDelayMin ?? null }
      : {}),
    ...(typeof data.playwrightActionDelayMax === 'number' || data.playwrightActionDelayMax === null
      ? { playwrightActionDelayMax: data.playwrightActionDelayMax ?? null }
      : {}),
    ...(typeof data.playwrightProxyEnabled === 'boolean' || data.playwrightProxyEnabled === null
      ? { playwrightProxyEnabled: data.playwrightProxyEnabled ?? null }
      : {}),
    ...(typeof data.playwrightProxyServer === 'string' || data.playwrightProxyServer === null
      ? { playwrightProxyServer: data.playwrightProxyServer ?? null }
      : {}),
    ...(typeof data.playwrightProxyUsername === 'string' || data.playwrightProxyUsername === null
      ? { playwrightProxyUsername: data.playwrightProxyUsername ?? null }
      : {}),
    ...(data.playwrightProxyPassword === null
      ? { playwrightProxyPassword: null }
      : {}),
    ...(typeof data.playwrightProxyPassword === 'string' && data.playwrightProxyPassword.trim()
      ? {
        playwrightProxyPassword: encryptSecret(data.playwrightProxyPassword.trim()),
      }
      : {}),
    ...(typeof data.playwrightBrowser === 'string' || data.playwrightBrowser === null
      ? { playwrightBrowser: data.playwrightBrowser ?? 'auto' }
      : {}),
    ...(typeof data.playwrightIdentityProfile === 'string' ||
    data.playwrightIdentityProfile === null
      ? { playwrightIdentityProfile: data.playwrightIdentityProfile ?? null }
      : {}),
    ...(typeof data.playwrightEmulateDevice === 'boolean' || data.playwrightEmulateDevice === null
      ? { playwrightEmulateDevice: data.playwrightEmulateDevice ?? null }
      : {}),
    ...(typeof data.playwrightDeviceName === 'string' || data.playwrightDeviceName === null
      ? { playwrightDeviceName: data.playwrightDeviceName ?? null }
      : {}),
    ...(typeof data.playwrightPersonaId === 'string' || data.playwrightPersonaId === null
      ? { playwrightPersonaId: data.playwrightPersonaId ?? null }
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
    ...(typeof data.allegroUseSandbox === 'boolean'
      ? { allegroUseSandbox: data.allegroUseSandbox }
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
    ...(typeof data.traderaApiAppKey === 'string' && data.traderaApiAppKey.trim()
      ? {
        traderaApiAppKey: encryptSecret(data.traderaApiAppKey.trim()),
      }
      : {}),
    ...(typeof data.traderaApiPublicKey === 'string' || data.traderaApiPublicKey === null
      ? { traderaApiPublicKey: data.traderaApiPublicKey ?? null }
      : {}),
    ...(typeof data.traderaApiUserId === 'number'
      ? { traderaApiUserId: data.traderaApiUserId }
      : {}),
    ...(typeof data.traderaApiToken === 'string' && data.traderaApiToken.trim()
      ? {
        traderaApiToken: encryptSecret(data.traderaApiToken.trim()),
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
    id: connection.id,
    integrationId: connection.integrationId,
    name: connection.name,
    username: connection.username,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
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
  });
}

/**
 * DELETE /api/v2/integrations/connections/[id]
 * Deletes an integration connection.
 */
export async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Connection id is required');
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    throw authError('Unauthorized.');
  }

  const parsed = await parseJsonBody(req, deleteConnectionSchema, {
    logPrefix: 'integrations.connection.DELETE',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const user = await findAuthUserById(userId);
  if (!user?.passwordHash) {
    throw authError('Unable to verify password for this account.');
  }

  const isPasswordValid = await bcrypt.compare(parsed.data.userPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw authError('Invalid password.');
  }

  const query = (_ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const replacementConnectionId = query.replacementConnectionId ?? undefined;

  const repo = await getIntegrationRepository();
  await repo.deleteConnection(id, {
    replacementConnectionId,
  });
  return new Response(null, { status: 204 });
}
