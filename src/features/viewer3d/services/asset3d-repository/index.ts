import type { Asset3DRepository } from '@/shared/contracts/viewer3d';

import { Asset3DRepositoryImpl } from './mongo-asset3d-repository';

export function getAsset3DRepository(): Asset3DRepository {
  return Asset3DRepositoryImpl;
}
