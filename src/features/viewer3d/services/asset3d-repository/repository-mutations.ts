import { type Db } from 'mongodb';
import { type Asset3DCreateInput, type Asset3DRecord } from '@/shared/contracts/viewer3d';
import { type Asset3DDocument, mapDocToRecord } from './repository-utils';
import { getCollection } from './repository-db-helpers';
import { randomUUID } from 'crypto';

const nullableString = (value: string | null | undefined): string | null => value ?? null;
const optionalString = (value: string | undefined): string | undefined => value;
const optionalBoolean = (value: boolean | undefined): boolean => value ?? false;
const optionalNumber = (value: number | undefined): number => value ?? 0;

export async function createAsset3D(db: Db, data: Asset3DCreateInput): Promise<Asset3DRecord> {
  const collection = await getCollection(db);
  const doc: Asset3DDocument = {
    _id: randomUUID(),
    id: randomUUID(),
    name: data.name,
    description: nullableString(data.description),
    fileId: optionalString(data.fileId),
    thumbnailId: nullableString(data.thumbnailId),
    categoryId: nullableString(data.categoryId),
    category: nullableString(data.categoryId),
    tags: data.tags ?? [],
    fileUrl: optionalString(data.fileUrl),
    filename: data.filename ?? 'unnamed',
    size: optionalNumber(data.size),
    isPublic: optionalBoolean(data.isPublic),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await collection.insertOne(doc);
  return mapDocToRecord(doc);
}
