import type { Asset3DRepository } from '@/shared/contracts/viewer3d';

import { prismaAsset3DRepository } from './prisma-asset3d-repository';

export function getAsset3DRepository(): Asset3DRepository {
  // For now, only Prisma is supported for Asset3D
  return prismaAsset3DRepository;
}
