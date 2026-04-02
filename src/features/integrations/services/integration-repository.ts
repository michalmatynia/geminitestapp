import type {
  IntegrationConnectionBasic,
  IntegrationRepository,
  IntegrationWithConnections,
} from '@/shared/contracts/integrations';
import { getMongoIntegrationRepository } from './integration-repository/mongo-impl';

export async function getIntegrationRepository(): Promise<IntegrationRepository> {
  return getMongoIntegrationRepository();
}

export async function getIntegrationsWithConnections(): Promise<IntegrationWithConnections[]> {
  const repo = await getIntegrationRepository();
  const integrations = await repo.listIntegrations();

  return Promise.all(
    integrations.map(async (integration) => {
      const connections = (await repo.listConnections(integration.id)).map(
        (connection): IntegrationConnectionBasic => ({
          id: connection.id,
          name: connection.name,
          integrationId: connection.integrationId,
          traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
          hasPlaywrightListingScript: Boolean(connection.playwrightListingScript?.trim()),
          traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
          traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
          traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
          traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
          traderaApiAppId: connection.traderaApiAppId ?? null,
          traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
          traderaApiUserId: connection.traderaApiUserId ?? null,
          traderaApiSandbox: connection.traderaApiSandbox ?? false,
        })
      );
      return {
        ...integration,
        connections,
      } as IntegrationWithConnections;
    })
  );
}

export { getMongoIntegrationRepository } from './integration-repository/mongo-impl';
