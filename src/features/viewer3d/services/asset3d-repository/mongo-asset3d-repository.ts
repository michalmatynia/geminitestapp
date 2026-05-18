import type { Db } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getArchMongoDb } from '@/shared/lib/db/arch-mongo-client';
import type { Asset3DCreateInput, Asset3DListFilters, Asset3DRecord, Asset3DRepository } from '@/shared/contracts/viewer3d';
import { createAsset3D, deleteAsset3D, updateAsset3D } from './repository-mutations';
import { getAsset3DById, listAssets3D } from './repository-queries';
import { getCollection } from './repository-db-helpers';

const createMongoAsset3DRepository = (getDb: () => Promise<Db>): Asset3DRepository => ({
  createAsset: async (data: Asset3DCreateInput): Promise<Asset3DRecord> => {
    const db = await getDb();
    return createAsset3D(db, data);
  },
  createAsset3D: async (data: Asset3DCreateInput): Promise<Asset3DRecord> => {
    const db = await getDb();
    return createAsset3D(db, data);
  },
  getAssetById: async (id: string): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return getAsset3DById(db, id);
  },
  getAsset3DById: async (id: string): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return getAsset3DById(db, id);
  },
  listAssets: async (filters?: Asset3DListFilters): Promise<Asset3DRecord[]> => {
    const db = await getDb();
    return listAssets3D(db, filters);
  },
  listAssets3D: async (filters?: Asset3DListFilters): Promise<Asset3DRecord[]> => {
    const db = await getDb();
    return listAssets3D(db, filters);
  },
  updateAsset: async (id, data): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return updateAsset3D(db, id, data);
  },
  updateAsset3D: async (id, data): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return updateAsset3D(db, id, data);
  },
  deleteAsset: async (id): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return deleteAsset3D(db, id);
  },
  deleteAsset3D: async (id): Promise<Asset3DRecord | null> => {
    const db = await getDb();
    return deleteAsset3D(db, id);
  },
  getCategories: async (): Promise<unknown[]> => {
    const db = await getDb();
    const collection = await getCollection(db);
    const categories = await collection.distinct('categoryId');
    return categories.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  },
  getTags: async (): Promise<unknown[]> => {
    const db = await getDb();
    const collection = await getCollection(db);
    const tags = await collection.distinct('tags');
    return tags.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  },
});

export const Asset3DRepositoryImpl: Asset3DRepository =
  createMongoAsset3DRepository(getMongoDb);

export const ArchAsset3DRepositoryImpl: Asset3DRepository =
  createMongoAsset3DRepository(getArchMongoDb);
