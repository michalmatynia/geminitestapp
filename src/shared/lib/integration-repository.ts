import type { IntegrationRepository } from '@/shared/contracts/integration-storage';

import { getMongoIntegrationRepository as getMongoIntegrationRepositoryImpl } from './integration-repository/mongo-impl';

export const getMongoIntegrationRepository = (): IntegrationRepository =>
  getMongoIntegrationRepositoryImpl();
