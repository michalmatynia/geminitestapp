import 'server-only';

import { repository, ProductOrdersImportRepository } from './segments/repository';

export * from './segments/types';
export * from './segments/mappers';
export * from './segments/repository';

export const getProductOrdersImportRepository = async (): Promise<ProductOrdersImportRepository> =>
  repository;
