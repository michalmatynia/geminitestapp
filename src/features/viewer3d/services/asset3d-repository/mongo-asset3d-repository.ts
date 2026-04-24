import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { Asset3DCreateInput, Asset3DListFilters, Asset3DRecord, Asset3DRepository } from '@/shared/contracts/viewer3d';
import { createAsset3D } from './repository-mutations';
import { getAsset3DById, listAssets3D } from './repository-queries';

export const Asset3DRepositoryImpl: Asset3DRepository = {
  create: async (data: Asset3DCreateInput): Promise<Asset3DRecord> => {
    const db = await getMongoDb();
    return createAsset3D(db, data);
  },
  getById: async (id: string): Promise<Asset3DRecord | null> => {
    const db = await getMongoDb();
    return getAsset3DById(db, id);
  },
  list: async (filters?: Asset3DListFilters): Promise<Asset3DRecord[]> => {
    const db = await getMongoDb();
    return listAssets3D(db, filters);
  },
  update: () => { throw new Error('Not implemented'); },
  delete: () => { throw new Error('Not implemented'); },
};
