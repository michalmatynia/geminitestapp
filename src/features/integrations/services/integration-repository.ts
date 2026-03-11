import { IntegrationRepository, IntegrationWithConnections } from '../types/integrations';
import { getMongoIntegrationRepository } from './integration-repository/mongo-impl';

export async function getIntegrationRepository(): Promise<IntegrationRepository> {
  return getMongoIntegrationRepository();
}

export async function getIntegrationsWithConnections(): Promise<IntegrationWithConnections[]> {
  const repo = await getIntegrationRepository();
  const integrations = await repo.listIntegrations();

  return Promise.all(
    integrations.map(async (integration) => {
      const connections = await repo.listConnections(integration.id);
      return {
        ...integration,
        connections,
      } as IntegrationWithConnections;
    })
  );
}

export { getMongoIntegrationRepository } from './integration-repository/mongo-impl';
