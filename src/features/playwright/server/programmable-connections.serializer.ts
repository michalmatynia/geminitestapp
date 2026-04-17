import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

import { serializeProgrammableConnectionLegacyBrowserMigration } from '../utils/playwright-programmable-connection-migration';

const serializeBaseFields = (
  connection: IntegrationConnectionRecord
): Pick<
  ProgrammableIntegrationConnection,
  | 'id'
  | 'integrationId'
  | 'name'
  | 'username'
  | 'createdAt'
  | 'updatedAt'
  | 'hasPlaywrightStorageState'
  | 'playwrightStorageStateUpdatedAt'
  | 'hasAllegroAccessToken'
  | 'allegroTokenUpdatedAt'
  | 'allegroExpiresAt'
  | 'allegroScope'
  | 'allegroUseSandbox'
  | 'hasLinkedInAccessToken'
  | 'linkedinTokenUpdatedAt'
  | 'linkedinExpiresAt'
  | 'linkedinScope'
  | 'linkedinPersonUrn'
  | 'linkedinProfileUrl'
  | 'hasBaseApiToken'
  | 'baseTokenUpdatedAt'
  | 'baseLastInventoryId'
> => ({
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
});

const serializeProgrammableFields = (
  connection: IntegrationConnectionRecord,
  actions?: PlaywrightAction[] | null
): Pick<
  ProgrammableIntegrationConnection,
  | 'playwrightLegacyBrowserMigration'
  | 'hasPlaywrightListingScript'
> => ({
  playwrightLegacyBrowserMigration: serializeProgrammableConnectionLegacyBrowserMigration({
    connection,
    actions: actions ?? undefined,
  }),
  hasPlaywrightListingScript: Boolean(connection.playwrightListingScript?.trim()),
});

const serializeProgrammableScriptFields = (
  connection: IntegrationConnectionRecord
): Pick<
  ProgrammableIntegrationConnection,
  | 'playwrightListingScript'
  | 'playwrightImportScript'
  | 'playwrightImportBaseUrl'
  | 'playwrightListingActionId'
  | 'playwrightImportActionId'
  | 'playwrightImportCaptureRoutesJson'
  | 'playwrightFieldMapperJson'
> => ({
  playwrightListingScript: connection.playwrightListingScript ?? null,
  playwrightImportScript: connection.playwrightImportScript ?? null,
  playwrightImportBaseUrl: connection.playwrightImportBaseUrl ?? null,
  playwrightListingActionId: connection.playwrightListingActionId ?? null,
  playwrightImportActionId: connection.playwrightImportActionId ?? null,
  playwrightImportCaptureRoutesJson: connection.playwrightImportCaptureRoutesJson ?? null,
  playwrightFieldMapperJson: connection.playwrightFieldMapperJson ?? null,
});

const serializeTraderaModeDefaults = (
  connection: IntegrationConnectionRecord
): Pick<
  ProgrammableIntegrationConnection,
  | 'traderaBrowserMode'
  | 'traderaCategoryStrategy'
  | 'traderaDefaultTemplateId'
  | 'traderaDefaultDurationHours'
  | 'traderaAutoRelistEnabled'
  | 'traderaAutoRelistLeadMinutes'
> => ({
  traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
  traderaCategoryStrategy: connection.traderaCategoryStrategy ?? 'mapper',
  traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
  traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
  traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
  traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
});

const serializeTraderaApiDefaults = (
  connection: IntegrationConnectionRecord
): Pick<
  ProgrammableIntegrationConnection,
  | 'traderaApiAppId'
  | 'traderaApiPublicKey'
  | 'traderaApiUserId'
  | 'traderaApiSandbox'
  | 'traderaParameterMapperRulesJson'
  | 'traderaParameterMapperCatalogJson'
  | 'hasTraderaApiAppKey'
  | 'hasTraderaApiToken'
  | 'traderaApiTokenUpdatedAt'
> => ({
  traderaApiAppId: connection.traderaApiAppId ?? null,
  traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
  traderaApiUserId: connection.traderaApiUserId ?? null,
  traderaApiSandbox: connection.traderaApiSandbox ?? false,
  traderaParameterMapperRulesJson: connection.traderaParameterMapperRulesJson ?? null,
  traderaParameterMapperCatalogJson: connection.traderaParameterMapperCatalogJson ?? null,
  hasTraderaApiAppKey: Boolean(connection.traderaApiAppKey),
  hasTraderaApiToken: Boolean(connection.traderaApiToken),
  traderaApiTokenUpdatedAt: connection.traderaApiTokenUpdatedAt ?? null,
});

const serializeScannerDefaults = (
  connection: IntegrationConnectionRecord
): Pick<
  ProgrammableIntegrationConnection,
  | 'scanner1688StartUrl'
  | 'scanner1688LoginMode'
  | 'scanner1688DefaultSearchMode'
  | 'scanner1688CandidateResultLimit'
  | 'scanner1688MinimumCandidateScore'
  | 'scanner1688MaxExtractedImages'
  | 'scanner1688AllowUrlImageSearchFallback'
> => ({
  scanner1688StartUrl: connection.scanner1688StartUrl ?? null,
  scanner1688LoginMode: connection.scanner1688LoginMode ?? null,
  scanner1688DefaultSearchMode: connection.scanner1688DefaultSearchMode ?? null,
  scanner1688CandidateResultLimit: connection.scanner1688CandidateResultLimit ?? null,
  scanner1688MinimumCandidateScore: connection.scanner1688MinimumCandidateScore ?? null,
  scanner1688MaxExtractedImages: connection.scanner1688MaxExtractedImages ?? null,
  scanner1688AllowUrlImageSearchFallback:
    connection.scanner1688AllowUrlImageSearchFallback ?? null,
});

export const serializePlaywrightProgrammableConnection = ({
  connection,
  actions,
}: {
  connection: IntegrationConnectionRecord;
  actions?: PlaywrightAction[] | null;
}): ProgrammableIntegrationConnection => ({
  ...serializeBaseFields(connection),
  ...serializeProgrammableFields(connection, actions),
  ...serializeProgrammableScriptFields(connection),
  ...serializeTraderaModeDefaults(connection),
  ...serializeTraderaApiDefaults(connection),
  ...serializeScannerDefaults(connection),
});
