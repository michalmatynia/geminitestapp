import 'server-only';

import type { ImageFileRepository } from '@/shared/contracts/files';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';

import {
  mongoImageFileRepository,
  productMongoImageFileRepository,
} from './mongo-image-file-repository';

export const getImageFileRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ImageFileRepository> => {
  return providerOverride ? productMongoImageFileRepository : mongoImageFileRepository;
};

export const getProductImageFileRepository = async (): Promise<ImageFileRepository> =>
  productMongoImageFileRepository;
