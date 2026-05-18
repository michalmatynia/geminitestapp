import type { Asset3DRecord, Asset3DRepository } from '@/shared/contracts/viewer3d';
import type { FileStorageProfile } from '@/shared/lib/files/constants';

import {
  ArchAsset3DRepositoryImpl,
  Asset3DRepositoryImpl,
} from './mongo-asset3d-repository';

export function getAsset3DRepository(options?: {
  storageProfile?: FileStorageProfile;
}): Asset3DRepository {
  if (options?.storageProfile === 'milkbarCms') {
    return ArchAsset3DRepositoryImpl;
  }
  return Asset3DRepositoryImpl;
}

export function getAsset3DRepositoriesForLookup(): Asset3DRepository[] {
  return [Asset3DRepositoryImpl, ArchAsset3DRepositoryImpl];
}

type Asset3DRepositoryMatch = {
  repository: Asset3DRepository;
  asset: Asset3DRecord;
};

export async function findAsset3DRepositoryAsset(
  id: string
): Promise<Asset3DRepositoryMatch | null> {
  const repositories = getAsset3DRepositoriesForLookup();
  const results = await Promise.allSettled(
    repositories.map(async (repository) => ({
      repository,
      asset: await repository.getAsset3DById(id),
    }))
  );
  const found = results.find(
    (result) => result.status === 'fulfilled' && result.value.asset !== null
  );
  if (found?.status !== 'fulfilled' || found.value.asset === null) return null;
  return {
    repository: found.value.repository,
    asset: found.value.asset,
  };
}

export async function getAsset3DFromLookupRepositories(
  id: string
): Promise<Asset3DRecord | null> {
  return (await findAsset3DRepositoryAsset(id))?.asset ?? null;
}
