import { type Db } from 'mongodb';
import {
  type Asset3DCreateInput,
  type Asset3DRecord,
  type Asset3DUpdateInput,
} from '@/shared/contracts/viewer3d';
import { type Asset3DDocument, buildIdFilter, mapDocToRecord } from './repository-utils';
import { getCollection } from './repository-db-helpers';
import { randomUUID } from 'crypto';

const nullableString = (value: string | null | undefined): string | null => value ?? null;
const optionalString = (value: string | undefined): string | undefined => value;
const optionalBoolean = (value: boolean | undefined): boolean => value ?? false;
const optionalNumber = (value: number | undefined): number => value ?? 0;

export async function createAsset3D(db: Db, data: Asset3DCreateInput): Promise<Asset3DRecord> {
  const collection = await getCollection(db);
  const id = randomUUID();
  const doc: Asset3DDocument = {
    _id: id,
    id,
    name: data.name,
    description: nullableString(data.description),
    fileId: optionalString(data.fileId),
    thumbnailId: nullableString(data.thumbnailId),
    categoryId: nullableString(data.categoryId),
    category: nullableString(data.categoryId),
    tagIds: data.tagIds ?? [],
    tags: data.tags ?? [],
    fileUrl: optionalString(data.fileUrl),
    thumbnailUrl: nullableString(data.thumbnailUrl),
    filename: data.filename ?? 'unnamed',
    filepath: data.filepath ?? data.fileUrl,
    mimetype: optionalString(data.mimetype),
    size: optionalNumber(data.size),
    fileSize: optionalNumber(data.fileSize ?? data.size),
    format: optionalString(data.format),
    isPublic: optionalBoolean(data.isPublic),
    metadata: data.metadata ?? {},
    viewerConfig: data.viewerConfig ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await collection.insertOne(doc);
  return mapDocToRecord(doc);
}

const buildUpdateSet = (data: Asset3DUpdateInput): Partial<Asset3DDocument> => {
  const set: Partial<Asset3DDocument> = { updatedAt: new Date() };

  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = nullableString(data.description);
  if (data.fileId !== undefined) set.fileId = data.fileId;
  if (data.thumbnailId !== undefined) set.thumbnailId = nullableString(data.thumbnailId);
  if (data.categoryId !== undefined) {
    set.categoryId = nullableString(data.categoryId);
    set.category = nullableString(data.categoryId);
  }
  if (data.tagIds !== undefined) set.tagIds = data.tagIds;
  if (data.tags !== undefined) set.tags = data.tags;
  if (data.fileUrl !== undefined) set.fileUrl = data.fileUrl;
  if (data.thumbnailUrl !== undefined) set.thumbnailUrl = nullableString(data.thumbnailUrl);
  if (data.filename !== undefined) set.filename = data.filename;
  if (data.filepath !== undefined) set.filepath = data.filepath;
  if (data.mimetype !== undefined) set.mimetype = data.mimetype;
  if (data.size !== undefined) set.size = data.size;
  if (data.fileSize !== undefined) set.fileSize = data.fileSize;
  if (data.format !== undefined) set.format = data.format;
  if (data.isPublic !== undefined) set.isPublic = data.isPublic;
  if (data.metadata !== undefined) set.metadata = data.metadata;
  if (data.viewerConfig !== undefined) set.viewerConfig = data.viewerConfig;

  return set;
};

export async function updateAsset3D(
  db: Db,
  id: string,
  data: Asset3DUpdateInput
): Promise<Asset3DRecord | null> {
  const collection = await getCollection(db);
  const result = await collection.findOneAndUpdate(
    buildIdFilter(id),
    { $set: buildUpdateSet(data) },
    { returnDocument: 'after' }
  );
  return result === null ? null : mapDocToRecord(result);
}

export async function deleteAsset3D(db: Db, id: string): Promise<Asset3DRecord | null> {
  const collection = await getCollection(db);
  const result = await collection.findOneAndDelete(buildIdFilter(id));
  return result === null ? null : mapDocToRecord(result);
}
