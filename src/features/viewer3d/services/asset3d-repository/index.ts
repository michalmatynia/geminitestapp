import type { Asset3DRepository } from '@/features/viewer3d/types';

import { prismaAsset3DRepository } from './prisma-asset3d-repository';

export function getAsset3DRepository(): Asset3DRepository {
  // For now, only Prisma is supported for Asset3D
  return prismaAsset3DRepository;
}
