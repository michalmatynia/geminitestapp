import 'server-only';

import type { ImageFileRepository } from '@/shared/contracts/files';
import { type ProductDbProvider } from '@/shared/lib/products/services/product-provider';

import {
  cmsBuilderMongoImageFileRepository,
  mongoImageFileRepository,
  productMongoImageFileRepository,
} from './mongo-image-file-repository';

export const getImageFileRepository = async (
  providerOverride?: ProductDbProvider,
  options?: { applicationId?: 'cms-builder' | null }
): Promise<ImageFileRepository> => {
  if (options?.applicationId === 'cms-builder') return cmsBuilderMongoImageFileRepository;
  return providerOverride ? productMongoImageFileRepository : mongoImageFileRepository;
};

export const getProductImageFileRepository = async (): Promise<ImageFileRepository> =>
  productMongoImageFileRepository;

export const getCmsBuilderImageFileRepository = async (): Promise<ImageFileRepository> =>
  cmsBuilderMongoImageFileRepository;
