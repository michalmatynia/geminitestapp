import type {
  IntegrationConnectionRecord,
  IntegrationRecord,
  IntegrationRepository,
} from '@/shared/contracts/integration-storage';

import {
  getMongoIntegrationRepository as getMainMongoIntegrationRepositoryImpl,
  getProductsMongoIntegrationRepository as getProductsMongoIntegrationRepositoryImpl,
} from './integration-repository/mongo-impl';

const PRODUCT_COMMERCE_INTEGRATION_SLUGS = new Set([
  '1688',
  'allegro',
  'base',
  'base-com',
  'baselinker',
  'scraped-source',
  'tradera',
  'tradera-api',
  'vinted',
]);

type RepositoryRoute = {
  repo: IntegrationRepository;
  integration?: IntegrationRecord | null;
};

type ConnectionRoute = {
  repo: IntegrationRepository;
  connection: IntegrationConnectionRecord | null;
};

const isProductCommerceIntegration = (
  integration: IntegrationRecord | null | undefined
): boolean => PRODUCT_COMMERCE_INTEGRATION_SLUGS.has(integration?.slug ?? '');

const sortIntegrationsByName = (integrations: IntegrationRecord[]): IntegrationRecord[] =>
  integrations.sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    if (nameComparison !== 0) return nameComparison;
    return left.id.localeCompare(right.id);
  });

const createSegmentedMongoIntegrationRepository = (
  mainRepo: IntegrationRepository,
  productsRepo: IntegrationRepository
): IntegrationRepository => {
  const resolveRouteForIntegrationId = async (integrationId: string): Promise<RepositoryRoute> => {
    const productsIntegration = await productsRepo.getIntegrationById(integrationId);
    if (isProductCommerceIntegration(productsIntegration)) {
      return { repo: productsRepo, integration: productsIntegration };
    }

    const mainIntegration = await mainRepo.getIntegrationById(integrationId);
    if (mainIntegration) {
      return { repo: mainRepo, integration: mainIntegration };
    }

    return { repo: productsRepo, integration: productsIntegration };
  };

  const resolveRouteForConnectionId = async (connectionId: string): Promise<ConnectionRoute> => {
    const productsConnection = await productsRepo.getConnectionById(connectionId);
    if (productsConnection) {
      const productsIntegration = await productsRepo.getIntegrationById(
        productsConnection.integrationId
      );
      if (isProductCommerceIntegration(productsIntegration)) {
        return { repo: productsRepo, connection: productsConnection };
      }
    }

    const mainConnection = await mainRepo.getConnectionById(connectionId);
    if (mainConnection) {
      return { repo: mainRepo, connection: mainConnection };
    }

    return { repo: productsRepo, connection: productsConnection };
  };

  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const [mainIntegrations, productsIntegrations] = await Promise.all([
        mainRepo.listIntegrations(),
        productsRepo.listIntegrations(),
      ]);
      const scopedMainIntegrations = mainIntegrations.filter(
        (integration) => !isProductCommerceIntegration(integration)
      );
      const scopedProductsIntegrations = productsIntegrations.filter(isProductCommerceIntegration);
      return sortIntegrationsByName([...scopedMainIntegrations, ...scopedProductsIntegrations]);
    },

    async upsertIntegration(input: { name: string; slug: string }): Promise<IntegrationRecord> {
      const repo = PRODUCT_COMMERCE_INTEGRATION_SLUGS.has(input.slug) ? productsRepo : mainRepo;
      return repo.upsertIntegration(input);
    },

    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      const route = await resolveRouteForIntegrationId(id);
      return route.integration ?? null;
    },

    async listConnections(integrationId: string): Promise<IntegrationConnectionRecord[]> {
      const route = await resolveRouteForIntegrationId(integrationId);
      return route.repo.listConnections(integrationId);
    },

    async getConnectionById(id: string): Promise<IntegrationConnectionRecord | null> {
      const route = await resolveRouteForConnectionId(id);
      return route.connection;
    },

    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      const route = await resolveRouteForIntegrationId(integrationId);
      return route.repo.getConnectionByIdAndIntegration(id, integrationId);
    },

    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const route = await resolveRouteForIntegrationId(integrationId);
      return route.repo.createConnection(integrationId, input);
    },

    async updateConnection(
      id: string,
      input: Parameters<IntegrationRepository['updateConnection']>[1]
    ): Promise<IntegrationConnectionRecord> {
      const route = await resolveRouteForConnectionId(id);
      return route.repo.updateConnection(id, input);
    },

    async deleteConnection(
      id: string,
      options?: Parameters<IntegrationRepository['deleteConnection']>[1]
    ): Promise<void> {
      const route = await resolveRouteForConnectionId(id);
      await route.repo.deleteConnection(id, options);
    },
  };
};

export const getMainMongoIntegrationRepository = (): IntegrationRepository =>
  getMainMongoIntegrationRepositoryImpl();

export const getProductsMongoIntegrationRepository = (): IntegrationRepository =>
  getProductsMongoIntegrationRepositoryImpl();

export const getMongoIntegrationRepository = (): IntegrationRepository =>
  createSegmentedMongoIntegrationRepository(
    getMainMongoIntegrationRepository(),
    getProductsMongoIntegrationRepository()
  );
