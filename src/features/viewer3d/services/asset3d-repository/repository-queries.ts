import { type Db, type Filter } from 'mongodb';
import { type Asset3DListFilters, type Asset3DRecord } from '@/shared/contracts/viewer3d';
import { type Asset3DDocument, mapDocToRecord, normalizeString, buildIdFilter } from './repository-utils';
import { getCollection } from './repository-db-helpers';

export async function getAsset3DById(db: Db, id: string): Promise<Asset3DRecord | null> {
  const collection = await getCollection(db);
  const doc = await collection.findOne(buildIdFilter(id));
  return doc ? mapDocToRecord(doc) : null;
}

export async function listAssets3D(db: Db, filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const collection = await getCollection(db);
  const clauses: Filter<Asset3DDocument>[] = [];

  const filename = normalizeString(filters?.filename);
  if (filename !== null) {
    clauses.push({ filename: { $regex: filename, $options: 'i' } });
  }

  const categoryId = normalizeString(filters?.categoryId);
  if (categoryId !== null) {
    clauses.push({
      $or: [
        { categoryId },
        { category: categoryId },
      ],
    });
  }

  const search = normalizeString(filters?.search);
  if (search !== null) {
    clauses.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { filename: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (filters?.isPublic !== undefined) {
    clauses.push({ isPublic: filters.isPublic });
  }

  if (filters?.tags !== undefined && filters.tags.length > 0) {
    clauses.push({
      $or: [
        { tags: { $in: filters.tags } },
        { tagIds: { $in: filters.tags } },
      ],
    });
  }

  const cursor = collection.find(clauses.length > 0 ? { $and: clauses } : {});
  const docs = await cursor.toArray();
  return docs.map(mapDocToRecord);
}
