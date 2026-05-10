import type { IntegrationRepository } from '@/shared/contracts/integration-storage';

import {
  getMongoIntegrationRepository as getMainMongoIntegrationRepositoryImpl,
  getProductsMongoIntegrationRepository as getProductsMongoIntegrationRepositoryImpl,
} from './integration-repository/mongo-impl';

export const getMainMongoIntegrationRepository = (): IntegrationRepository =>
  getMainMongoIntegrationRepositoryImpl();

export const getProductsMongoIntegrationRepository = (): IntegrationRepository =>
  getProductsMongoIntegrationRepositoryImpl();

export const getMongoIntegrationRepository = (): IntegrationRepository =>
  getMainMongoIntegrationRepository();
