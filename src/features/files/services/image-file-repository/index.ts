import 'server-only';

import { mongoImageFileRepository } from '@/features/files/services/image-file-repository/mongo-image-file-repository';
import { prismaImageFileRepository } from '@/features/files/services/image-file-repository/prisma-image-file-repository';
import { getProductDataProvider, type ProductDbProvider } from '@/features/products/server';
import type { ImageFileRepository } from '@/shared/contracts/files';

export const getImageFileRepository = async (
  providerOverride?: ProductDbProvider,
): Promise<ImageFileRepository> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  if (provider === 'mongodb') {
    return mongoImageFileRepository as unknown as ImageFileRepository;
  }
  return prismaImageFileRepository as unknown as ImageFileRepository;
};
