import { type Db, type Filter } from 'mongodb';
import { type Asset3DListFilters, type Asset3DRecord } from '@/shared/contracts/viewer3d';
import { type Asset3DDocument, mapDocToRecord, normalizeString, buildIdFilter } from './repository-utils';
import { getCollection } from './repository-db-helpers';

export async function getAsset3DById(db: Db, id: string): Promise<Asset3DRecord | null> {
  const collection = await getCollection(db);
  const doc = await collection.findOne(buildIdFilter(id));
  return doc ? mapDocToRecord(doc) : null;
}

/**
 * Retrieves a list of 3D assets based on optional filters.
 * Refactored to reduce cyclomatic complexity by extracting query building logic.
 */
export async function listAssets3D(db: Db, filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const collection = await getCollection(db);
  const clauses: Filter<Asset3DDocument>[] = [];

  // Apply individual filter logic
  applyFilenameFilter(clauses, filters?.filename);
  applyCategoryFilter(clauses, filters?.categoryId);
  applySearchFilter(clauses, filters?.search);
  applyPublicFilter(clauses, filters?.isPublic);
  applyStorageProfileFilter(clauses, filters?.storageProfile);
  applyTagsFilter(clauses, filters?.tags);

  const query = clauses.length > 0 ? { $and: clauses } : {};
  const cursor = collection.find(query);
  const docs = await cursor.toArray();
  return docs.map(mapDocToRecord);
}

/**
 * Adds a regex filter for the filename field.
 */
function applyFilenameFilter(clauses: Filter<Asset3DDocument>[], filename?: unknown): void {
  const normalized = normalizeString(filename);
  if (normalized !== null) {
    clauses.push({ filename: { $regex: normalized, $options: 'i' } });
  }
}

/**
 * Adds a filter for matching category ID or category name.
 */
function applyCategoryFilter(clauses: Filter<Asset3DDocument>[], categoryId?: unknown): void {
  const normalized = normalizeString(categoryId);
  if (normalized !== null) {
    clauses.push({
      $or: [
        { categoryId: normalized },
        { category: normalized },
      ],
    });
  }
}

/**
 * Adds a regex filter for global text search across asset fields.
 */
function applySearchFilter(clauses: Filter<Asset3DDocument>[], search?: unknown): void {
  const normalized = normalizeString(search);
  if (normalized !== null) {
    clauses.push({
      $or: [
        { name: { $regex: normalized, $options: 'i' } },
        { filename: { $regex: normalized, $options: 'i' } },
        { description: { $regex: normalized, $options: 'i' } },
      ],
    });
  }
}

/**
 * Adds an exact match filter for public status.
 */
function applyPublicFilter(clauses: Filter<Asset3DDocument>[], isPublic?: boolean): void {
  if (isPublic !== undefined) {
    clauses.push({ isPublic });
  }
}

/**
 * Adds a filter for storage profile with support for default profile mapping.
 */
function applyStorageProfileFilter(clauses: Filter<Asset3DDocument>[], storageProfile?: unknown): void {
  const normalized = normalizeString(storageProfile);
  if (normalized !== null) {
    clauses.push(
      normalized === 'default'
        ? {
            $or: [
              { 'metadata.storageProfile': 'default' },
              { 'metadata.storageProfile': { $exists: false } },
            ],
          }
        : { 'metadata.storageProfile': normalized }
    );
  }
}

/**
 * Adds an $in filter for tags, matching either tag IDs or tag names.
 */
function applyTagsFilter(clauses: Filter<Asset3DDocument>[], tags?: string[]): void {
  if (tags !== undefined && tags.length > 0) {
    clauses.push({
      $or: [
        { tags: { $in: tags } },
        { tagIds: { $in: tags } },
      ],
    });
  }
}
