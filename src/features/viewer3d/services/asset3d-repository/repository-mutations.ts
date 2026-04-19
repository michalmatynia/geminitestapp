import { type Db } from 'mongodb';
import { type Asset3DCreateInput, type Asset3DRecord } from '@/shared/contracts/viewer3d';
import { type Asset3DDocument, mapDocToRecord } from './repository-utils';
import { getCollection } from './repository-db-helpers';
import { randomUUID } from 'crypto';

export async function createAsset3D(db: Db, data: Asset3DCreateInput): Promise<Asset3DRecord> {
  const collection = await getCollection(db);
  const doc: Asset3DDocument = {
    _id: new randomUUID().toString(),
    id: randomUUID(),
    name: data.name ?? null,
    description: data.description ?? null,
    fileId: data.fileId ?? undefined,
    thumbnailId: data.thumbnailId ?? null,
    categoryId: data.categoryId ?? null,
    category: data.categoryId ?? null,
    tags: data.tags ?? [],
    fileUrl: data.fileUrl ?? undefined,
    filename: data.filename ?? 'unnamed',
    size: data.size ?? 0,
    isPublic: data.isPublic ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await collection.insertOne(doc);
  return mapDocToRecord(doc);
}
