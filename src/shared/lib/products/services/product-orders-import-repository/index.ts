import 'server-only';

import { repository, type ProductOrdersImportRepository } from './segments/repository';

export * from './segments/types';
export * from './segments/mappers';
export * from './segments/repository';

export const getProductOrdersImportRepository = (): Promise<ProductOrdersImportRepository> =>
  Promise.resolve(repository);
