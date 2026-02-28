import 'server-only';

import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import type { ImageFileRepository } from '@/shared/contracts/files';
import { mongoImageFileRepository } from './mongo-image-file-repository';
import { prismaImageFileRepository } from './prisma-image-file-repository';

export const getImageFileRepository = async (
  providerOverride?: ProductDbProvider
): Promise<ImageFileRepository> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  if (provider === 'mongodb') {
    return mongoImageFileRepository as unknown as ImageFileRepository;
  }
  return prismaImageFileRepository as unknown as ImageFileRepository;
};
