import type { Asset3DRepository } from '@/shared/contracts/viewer3d';

import { mongoAsset3DRepository } from './mongo-asset3d-repository';

export function getAsset3DRepository(): Asset3DRepository {
  return mongoAsset3DRepository;
}
