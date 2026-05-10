import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type {
  IntegrationConnectionRecord,
  IntegrationRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';
import { getMongoIntegrationRepository } from '@/shared/lib/integration-repository';

const toIsoStringOrNull = (value: string | Date | null | undefined): string | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return typeof value === 'string' ? value : null;
};

const toIntegrationWithConnectionsBase = (
  integration: IntegrationRecord
): Omit<IntegrationWithConnections, 'connections'> => ({
  ...integration,
  createdAt: toIsoStringOrNull(integration.createdAt) ?? undefined,
  updatedAt: toIsoStringOrNull(integration.updatedAt),
});

type Scanner1688ConnectionFields = Pick<
  IntegrationConnectionBasic,
  | 'scanner1688StartUrl'
  | 'scanner1688LoginMode'
  | 'scanner1688DefaultSearchMode'
  | 'scanner1688CandidateResultLimit'
  | 'scanner1688MinimumCandidateScore'
  | 'scanner1688MaxExtractedImages'
  | 'scanner1688AllowUrlImageSearchFallback'
>;

type TraderaListingConnectionFields = Pick<
  IntegrationConnectionBasic,
  | 'traderaDefaultTemplateId'
  | 'traderaDefaultDurationHours'
  | 'traderaAutoRelistEnabled'
  | 'traderaAutoRelistLeadMinutes'
>;

type TraderaApiConnectionFields = Pick<
  IntegrationConnectionBasic,
  'traderaApiAppId' | 'traderaApiPublicKey' | 'traderaApiUserId' | 'traderaApiSandbox'
>;

type GoogleConnectionFields = Pick<
  IntegrationConnectionBasic,
  'hasGoogleAccessToken' | 'googleScope' | 'googleExpiresAt' | 'googleTokenUpdatedAt'
>;

type BaseConnectionFields = Pick<IntegrationConnectionBasic, 'baseLastInventoryId'>;

type JobApplicationConnectionFields = Pick<
  IntegrationConnectionBasic,
  'jobApplicationPersonId' | 'jobApplicationPersonName'
>;

const toScanner1688ConnectionFields = (
  connection: IntegrationConnectionRecord
): Scanner1688ConnectionFields => ({
  scanner1688StartUrl: connection.scanner1688StartUrl ?? null,
  scanner1688LoginMode: connection.scanner1688LoginMode ?? null,
  scanner1688DefaultSearchMode: connection.scanner1688DefaultSearchMode ?? null,
  scanner1688CandidateResultLimit: connection.scanner1688CandidateResultLimit ?? null,
  scanner1688MinimumCandidateScore: connection.scanner1688MinimumCandidateScore ?? null,
  scanner1688MaxExtractedImages: connection.scanner1688MaxExtractedImages ?? null,
  scanner1688AllowUrlImageSearchFallback: connection.scanner1688AllowUrlImageSearchFallback ?? null,
});

const toTraderaListingConnectionFields = (
  connection: IntegrationConnectionRecord
): TraderaListingConnectionFields => ({
  traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
  traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
  traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
  traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
});

const toTraderaApiConnectionFields = (
  connection: IntegrationConnectionRecord
): TraderaApiConnectionFields => ({
  traderaApiAppId: connection.traderaApiAppId ?? null,
  traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
  traderaApiUserId: connection.traderaApiUserId ?? null,
  traderaApiSandbox: connection.traderaApiSandbox ?? false,
});

const toGoogleConnectionFields = (
  connection: IntegrationConnectionRecord
): GoogleConnectionFields => ({
  hasGoogleAccessToken: Boolean(connection.googleAccessToken),
  googleScope: connection.googleScope ?? null,
  googleExpiresAt: toIsoStringOrNull(connection.googleExpiresAt),
  googleTokenUpdatedAt: toIsoStringOrNull(connection.googleTokenUpdatedAt),
});

const toBaseConnectionFields = (
  connection: IntegrationConnectionRecord
): BaseConnectionFields => ({
  baseLastInventoryId: connection.baseLastInventoryId ?? null,
});

const toJobApplicationConnectionFields = (
  connection: IntegrationConnectionRecord
): JobApplicationConnectionFields => ({
  jobApplicationPersonId: connection.jobApplicationPersonId ?? null,
  jobApplicationPersonName: connection.jobApplicationPersonName ?? null,
});

const toIntegrationConnectionBasic = (
  connection: IntegrationConnectionRecord
): IntegrationConnectionBasic => ({
  id: connection.id,
  name: connection.name,
  integrationId: connection.integrationId,
  enabled: connection.enabled ?? true,
  hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
  traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
  hasPlaywrightListingScript: Boolean(connection.playwrightListingScript?.trim()),
  ...toScanner1688ConnectionFields(connection),
  ...toTraderaListingConnectionFields(connection),
  ...toTraderaApiConnectionFields(connection),
  ...toGoogleConnectionFields(connection),
  ...toBaseConnectionFields(connection),
  ...toJobApplicationConnectionFields(connection),
});

export function getIntegrationRepository(): IntegrationRepository {
  return getMongoIntegrationRepository();
}

export async function getIntegrationsWithConnections(): Promise<IntegrationWithConnections[]> {
  const repo = getIntegrationRepository();
  const integrations = await repo.listIntegrations();

  return Promise.all(
    integrations.map(async (integration) => {
      const connections = (await repo.listConnections(integration.id)).map((connection) =>
        toIntegrationConnectionBasic(connection)
      );
      const integrationWithConnections: IntegrationWithConnections = {
        ...toIntegrationWithConnectionsBase(integration),
        connections,
      };
      return integrationWithConnections;
    })
  );
}

export {
  getMainMongoIntegrationRepository,
  getMongoIntegrationRepository,
  getProductsMongoIntegrationRepository,
} from '@/shared/lib/integration-repository';
