import type { CollectionSchema } from '@/shared/contracts/database';
import { isObjectRecord } from '@/shared/utils/object-utils';
import type { SchemaResponse } from '@/shared/lib/ai-paths/api/client';

export const isCollectionSchema = (value: unknown): value is CollectionSchema =>
  isObjectRecord(value) && typeof value['name'] === 'string' && Array.isArray(value['fields']);

export const resolveCollectionList = (value: unknown): CollectionSchema[] => {
  if (Array.isArray(value)) {
    return value.filter((entry: unknown): entry is CollectionSchema => isCollectionSchema(entry));
  }
  if (isObjectRecord(value)) {
    return Object.values(value).filter((entry: unknown): entry is CollectionSchema =>
      isCollectionSchema(entry)
    );
  }
  return [];
};

export const cloneSchemaResponse = (schema: SchemaResponse): SchemaResponse => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(schema);
  }
  return JSON.parse(JSON.stringify(schema)) as SchemaResponse;
};

export const normalizeSelectedCollectionKey = (value: string): string => value.trim().toLowerCase();

export const matchesSelectedCollection = (
  collection: CollectionSchema,
  selectedSet: Set<string>
): boolean => {
  const nameKey = normalizeSelectedCollectionKey(collection.name);
  if (selectedSet.has(nameKey)) return true;
  if (collection.provider) {
    const providerKey = normalizeSelectedCollectionKey(`${collection.provider}:${collection.name}`);
    if (selectedSet.has(providerKey)) return true;
  }
  return false;
};

export const toFetchCollectionName = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes(':')) return trimmed;
  return trimmed.split(':').slice(1).join(':').trim();
};

export const dedupeCollectionNames = (values: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];
  values.forEach((value: string) => {
    const normalized = normalizeSelectedCollectionKey(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(value.trim());
  });
  return deduped;
};
