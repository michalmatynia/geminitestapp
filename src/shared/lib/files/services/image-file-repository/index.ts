import 'server-only';

import type { ImageFileRepository } from '@/shared/contracts/files';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';

import { mongoImageFileRepository } from './mongo-image-file-repository';
import { prismaImageFileRepository } from './prisma-image-file-repository';

export const getImageFileRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ImageFileRepository> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  if (provider === 'mongodb') {
    return mongoImageFileRepository;
  }
  return prismaImageFileRepository;
};
