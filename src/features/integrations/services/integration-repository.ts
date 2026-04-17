import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type {
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';
import { getMongoIntegrationRepository } from '@/shared/lib/integration-repository';

const toIntegrationConnectionBasic = (
  connection: IntegrationConnectionRecord
): IntegrationConnectionBasic => ({
  id: connection.id,
  name: connection.name,
  integrationId: connection.integrationId,
  hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
  traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
  hasPlaywrightListingScript: Boolean(connection.playwrightListingScript?.trim()),
  scanner1688StartUrl: connection.scanner1688StartUrl ?? null,
  scanner1688LoginMode: connection.scanner1688LoginMode ?? null,
  scanner1688DefaultSearchMode: connection.scanner1688DefaultSearchMode ?? null,
  scanner1688CandidateResultLimit: connection.scanner1688CandidateResultLimit ?? null,
  scanner1688MinimumCandidateScore: connection.scanner1688MinimumCandidateScore ?? null,
  scanner1688MaxExtractedImages: connection.scanner1688MaxExtractedImages ?? null,
  scanner1688AllowUrlImageSearchFallback: connection.scanner1688AllowUrlImageSearchFallback ?? null,
  traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
  traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
  traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
  traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
  traderaApiAppId: connection.traderaApiAppId ?? null,
  traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
  traderaApiUserId: connection.traderaApiUserId ?? null,
  traderaApiSandbox: connection.traderaApiSandbox ?? false,
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
        toIntegrationConnectionBasic(connection as IntegrationConnectionBasic & Record<string, unknown>)
      );
      const integrationWithConnections: IntegrationWithConnections = {
        ...integration,
        connections,
      };
      return integrationWithConnections;
    })
  );
}

export { getMongoIntegrationRepository } from '@/shared/lib/integration-repository';
