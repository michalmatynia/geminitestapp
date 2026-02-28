import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { IntegrationRepository, IntegrationWithConnections } from '../types/integrations';

import { getPrismaIntegrationRepository } from './integration-repository/prisma-impl';
import { getMongoIntegrationRepository } from './integration-repository/mongo-impl';

export async function getIntegrationRepository(): Promise<IntegrationRepository> {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return getMongoIntegrationRepository();
  }
  return getPrismaIntegrationRepository();
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

export { getPrismaIntegrationRepository } from './integration-repository/prisma-impl';
export { getMongoIntegrationRepository } from './integration-repository/mongo-impl';
