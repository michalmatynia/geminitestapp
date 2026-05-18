import 'server-only';

import { randomUUID } from 'crypto';

import type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
  ImageFileUpdateInput,
} from '@/shared/contracts/files';
import { getMongoDb as getCmsBuilderMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getMongoDb as getProductsMongoDb } from '@/shared/lib/db/product-mongo-client';

import type { Db, WithId } from 'mongodb';

type ImageFileDocument = {
  _id: string;
  id?: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  publicUrl?: string;
  url?: string;
  storageProvider?: string;
  metadata?: Record<string, unknown> | null;
  width: number | null;
  height: number | null;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  isAnimated?: boolean;
  hasAlpha?: boolean;
  blurHash?: string;
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

const IMAGE_FILE_COLLECTION = 'image_files';

const normalizeOptionalText = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalTextField = <TKey extends string>(
  key: TKey,
  value: string | null | undefined
): Partial<Record<TKey, string>> => {
  const normalized = normalizeOptionalText(value);
  const result: Partial<Record<TKey, string>> = {};
  if (normalized !== undefined) {
    result[key] = normalized;
  }
  return result;
};

const isImageFileStorageProvider = (
  value: unknown
): value is NonNullable<ImageFileRecord['storageProvider']> =>
  value === 'local' || value === 's3' || value === 'imagekit' || value === 'fastcomet';

const optionalStorageProviderField = (
  value: unknown
): Partial<Pick<ImageFileRecord, 'storageProvider'>> =>
  isImageFileStorageProvider(value) ? { storageProvider: value } : {};

const optionalMetadataField = (
  value: ImageFileDocument['metadata']
): Partial<Pick<ImageFileRecord, 'metadata'>> =>
  value !== undefined ? { metadata: value } : {};

const optionalBooleanField = <TKey extends 'hasAlpha' | 'isAnimated'>(
  key: TKey,
  value: boolean | undefined
): Partial<Record<TKey, boolean>> => {
  const result: Partial<Record<TKey, boolean>> = {};
  if (value !== undefined) {
    result[key] = value;
  }
  return result;
};

const toRecord = (doc: WithId<ImageFileDocument>): ImageFileRecord => ({
  id: doc.id ?? doc._id,
  filename: doc.filename,
  filepath: doc.filepath,
  mimetype: doc.mimetype,
  size: doc.size,
  ...optionalTextField('publicUrl', doc.publicUrl),
  ...optionalTextField('url', doc.url),
  ...optionalStorageProviderField(doc.storageProvider),
  ...optionalMetadataField(doc.metadata),
  width: doc.width ?? null,
  height: doc.height ?? null,
  ...optionalTextField('thumbnailPath', doc.thumbnailPath),
  ...optionalTextField('thumbnailUrl', doc.thumbnailUrl),
  ...optionalBooleanField('isAnimated', doc.isAnimated),
  ...optionalBooleanField('hasAlpha', doc.hasAlpha),
  ...optionalTextField('blurHash', doc.blurHash),
  tags: doc.tags ?? [],
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const createMongoImageFileRepository = (
  resolveDb: () => Promise<Db>
): ImageFileRepository => ({
  async createImageFile(data: ImageFileCreateInput) {
    const db = await resolveDb();
    const now = new Date();
    const id = randomUUID();
    const doc: ImageFileDocument = {
      _id: id,
      id,
      filename: data.filename,
      filepath: data.filepath,
      mimetype: data.mimetype,
      size: data.size,
      ...optionalTextField('publicUrl', data.publicUrl),
      ...optionalTextField('url', data.url),
      ...optionalStorageProviderField(data.storageProvider),
      ...optionalMetadataField(data.metadata),
      width: data.width ?? null,
      height: data.height ?? null,
      ...optionalTextField('thumbnailPath', data.thumbnailPath),
      ...optionalTextField('thumbnailUrl', data.thumbnailUrl),
      ...optionalBooleanField('isAnimated', data.isAnimated),
      ...optionalBooleanField('hasAlpha', data.hasAlpha),
      ...optionalTextField('blurHash', data.blurHash),
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<ImageFileDocument>(IMAGE_FILE_COLLECTION).insertOne(doc);
    return toRecord(doc as WithId<ImageFileDocument>);
  },

  async getImageFileById(id: string) {
    const db = await resolveDb();
    const doc = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? toRecord({ ...doc, _id: doc._id }) : null;
  },

  async listImageFiles(filters?: ImageFileListFilters) {
    const db = await resolveDb();
    const filename = filters?.filename?.trim();
    const tags = (filters?.tags ?? []).filter(Boolean);
    const query: Record<string, unknown> = {};
    if (filename !== undefined) {
      query['filename'] = { $regex: filename, $options: 'i' };
    }
    if (tags.length > 0) {
      query['tags'] = { $in: tags };
    }
    const docs = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .find(query)
      .toArray();
    return docs.map((doc: ImageFileDocument) => toRecord({ ...doc, _id: doc._id }));
  },

  async findImageFilesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await resolveDb();
    const docs = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .find({ $or: [{ _id: { $in: Array.from(ids) } }, { id: { $in: ids } }] })
      .toArray();
    return docs.map((doc: ImageFileDocument) => toRecord({ ...doc, _id: doc._id }));
  },

  async updateImageFilePath(id: string, filepath: string) {
    const db = await resolveDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: { filepath, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },

  async updateImageFileTags(id: string, tags: string[]) {
    const db = await resolveDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: { tags, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },

  async updateImageFile(id: string, data: ImageFileUpdateInput) {
    const db = await resolveDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },

  async deleteImageFile(id: string) {
    const db = await resolveDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndDelete({ $or: [{ _id: id }, { id }] });
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },
});

export const mongoImageFileRepository: ImageFileRepository =
  createMongoImageFileRepository(getMongoDb);

export const productMongoImageFileRepository: ImageFileRepository =
  createMongoImageFileRepository(() => getProductsMongoDb());

export const cmsBuilderMongoImageFileRepository: ImageFileRepository =
  createMongoImageFileRepository(() => getCmsBuilderMongoDb());
