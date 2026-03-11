import { vi } from 'vitest';

import * as mongoClientModule from '@/shared/lib/db/mongo-client';

type MongoDocument = Record<string, unknown>;
type MongoFilter = Record<string, unknown>;
type MongoProjection = Record<string, 0 | 1>;
type MongoSort = Record<string, 1 | -1>;
type MongoUpdate = {
  $set?: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
};

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getFieldValue = (doc: MongoDocument, path: string): unknown =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, doc);

const setFieldValue = (doc: MongoDocument, path: string, value: unknown): void => {
  const segments = path.split('.');
  const lastSegment = segments.pop();
  if (!lastSegment) return;
  let current = doc;
  for (const segment of segments) {
    const next = current[segment];
    if (!isRecord(next)) {
      current[segment] = {};
    }
    current = current[segment] as MongoDocument;
  }
  current[lastSegment] = value;
};

const toTimeValue = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const compareValues = (left: unknown, right: unknown): number => {
  const leftTime = toTimeValue(left);
  const rightTime = toTimeValue(right);
  if (leftTime !== null && rightTime !== null) {
    return leftTime - rightTime;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  const leftText = String(left ?? '');
  const rightText = String(right ?? '');
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  const leftTime = toTimeValue(left);
  const rightTime = toTimeValue(right);
  if (leftTime !== null && rightTime !== null) {
    return leftTime === rightTime;
  }
  return left === right;
};

const matchesCondition = (value: unknown, condition: unknown): boolean => {
  if (condition instanceof RegExp) {
    return condition.test(String(value ?? ''));
  }
  if (!isRecord(condition) || Object.keys(condition).every((key) => !key.startsWith('$'))) {
    return valuesEqual(value, condition);
  }

  for (const [operator, expected] of Object.entries(condition)) {
    switch (operator) {
      case '$in':
        if (!Array.isArray(expected) || !expected.some((entry) => valuesEqual(value, entry))) {
          return false;
        }
        break;
      case '$nin':
        if (Array.isArray(expected) && expected.some((entry) => valuesEqual(value, entry))) {
          return false;
        }
        break;
      case '$ne':
        if (valuesEqual(value, expected)) return false;
        break;
      case '$gt':
        if (!(compareValues(value, expected) > 0)) return false;
        break;
      case '$gte':
        if (!(compareValues(value, expected) >= 0)) return false;
        break;
      case '$lt':
        if (!(compareValues(value, expected) < 0)) return false;
        break;
      case '$lte':
        if (!(compareValues(value, expected) <= 0)) return false;
        break;
      case '$regex': {
        const regex = expected instanceof RegExp ? expected : new RegExp(String(expected), 'i');
        if (!regex.test(String(value ?? ''))) return false;
        break;
      }
      case '$exists': {
        const exists = value !== undefined;
        if (Boolean(expected) !== exists) return false;
        break;
      }
      default:
        return false;
    }
  }

  return true;
};

const matchesFilter = (doc: MongoDocument, filter: MongoFilter): boolean => {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (
        !Array.isArray(condition) ||
        !condition.every((entry) => isRecord(entry) && matchesFilter(doc, entry))
      ) {
        return false;
      }
      continue;
    }
    if (key === '$or') {
      if (
        !Array.isArray(condition) ||
        !condition.some((entry) => isRecord(entry) && matchesFilter(doc, entry))
      ) {
        return false;
      }
      continue;
    }
    if (!matchesCondition(getFieldValue(doc, key), condition)) {
      return false;
    }
  }
  return true;
};

const applyProjection = (doc: MongoDocument, projection?: MongoProjection): MongoDocument => {
  if (!projection) return cloneValue(doc);
  const projected: MongoDocument = {};
  for (const [key, include] of Object.entries(projection)) {
    if (!include) continue;
    setFieldValue(projected, key, cloneValue(getFieldValue(doc, key)));
  }
  return projected;
};

const applyUpdate = (doc: MongoDocument, update: MongoUpdate, isInsert: boolean): MongoDocument => {
  if (isInsert && isRecord(update.$setOnInsert)) {
    for (const [key, value] of Object.entries(update.$setOnInsert)) {
      setFieldValue(doc, key, cloneValue(value));
    }
  }
  if (isRecord(update.$set)) {
    for (const [key, value] of Object.entries(update.$set)) {
      setFieldValue(doc, key, cloneValue(value));
    }
  }
  return doc;
};

const extractPlainEqualityFields = (filter: MongoFilter): MongoDocument => {
  const fields: MongoDocument = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) continue;
    if (isRecord(value) && Object.keys(value).some((entry) => entry.startsWith('$'))) continue;
    fields[key] = cloneValue(value);
  }
  return fields;
};

class InMemoryCursor {
  private readonly source: MongoDocument[];
  private readonly projection?: MongoProjection;
  private sortSpec: MongoSort | null = null;
  private offset = 0;
  private limitValue: number | null = null;

  constructor(docs: MongoDocument[], projection?: MongoProjection) {
    this.source = docs;
    this.projection = projection;
  }

  sort(spec: MongoSort): this {
    this.sortSpec = spec;
    return this;
  }

  allowDiskUse(_value: boolean): this {
    return this;
  }

  skip(value: number): this {
    this.offset = value;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  async toArray(): Promise<MongoDocument[]> {
    return this.materialize();
  }

  async next(): Promise<MongoDocument | null> {
    return this.materialize()[0] ?? null;
  }

  private materialize(): MongoDocument[] {
    const docs = this.source.map((doc) => cloneValue(doc));
    if (this.sortSpec) {
      const sortEntries = Object.entries(this.sortSpec);
      docs.sort((left, right) => {
        for (const [field, direction] of sortEntries) {
          const comparison = compareValues(getFieldValue(left, field), getFieldValue(right, field));
          if (comparison !== 0) {
            return direction === -1 ? -comparison : comparison;
          }
        }
        return 0;
      });
    }
    const sliced = docs.slice(
      this.offset,
      this.limitValue === null ? undefined : this.offset + this.limitValue
    );
    return sliced.map((doc) => applyProjection(doc, this.projection));
  }
}

export const installInMemoryMongoPathRunDb = (): void => {
  const store = new Map<string, MongoDocument[]>();
  let idCounter = 0;
  const nextId = (): string => `mock-mongo-id-${++idCounter}`;
  const getCollectionStore = (name: string): MongoDocument[] => {
    const existing = store.get(name);
    if (existing) return existing;
    const created: MongoDocument[] = [];
    store.set(name, created);
    return created;
  };

  const collection = (name: string) => {
    const docs = getCollectionStore(name);

    return {
      async createIndex(_spec: Record<string, unknown>) {
        return `${name}-index`;
      },
      async insertOne(doc: MongoDocument) {
        const entry = cloneValue(doc);
        if (!entry['_id']) {
          entry['_id'] = nextId();
        }
        docs.push(entry);
        return { insertedId: entry['_id'] };
      },
      async insertMany(entries: MongoDocument[]) {
        for (const entry of entries) {
          const clone = cloneValue(entry);
          if (!clone['_id']) {
            clone['_id'] = nextId();
          }
          docs.push(clone);
        }
        return { acknowledged: true };
      },
      async findOne(filter: MongoFilter, options?: { projection?: MongoProjection; sort?: MongoSort }) {
        const cursor = new InMemoryCursor(
          docs.filter((doc) => matchesFilter(doc, filter)),
          options?.projection
        );
        if (options?.sort) cursor.sort(options.sort);
        return cursor.next();
      },
      find(filter: MongoFilter, options?: { projection?: MongoProjection }) {
        return new InMemoryCursor(
          docs.filter((doc) => matchesFilter(doc, filter)),
          options?.projection
        );
      },
      async findOneAndUpdate(
        filter: MongoFilter,
        update: MongoUpdate,
        options?: { returnDocument?: 'after' | 'before'; upsert?: boolean }
      ) {
        const index = docs.findIndex((doc) => matchesFilter(doc, filter));
        if (index === -1) {
          if (!options?.upsert) return null;
          const inserted = applyUpdate(
            {
              _id: nextId(),
              ...extractPlainEqualityFields(filter),
            },
            update,
            true
          );
          docs.push(inserted);
          return cloneValue(inserted);
        }

        const original = docs[index]!;
        const updated = applyUpdate(cloneValue(original), update, false);
        docs[index] = updated;
        return cloneValue(options?.returnDocument === 'before' ? original : updated);
      },
      async findOneAndDelete(filter: MongoFilter) {
        const index = docs.findIndex((doc) => matchesFilter(doc, filter));
        if (index === -1) return null;
        const [removed] = docs.splice(index, 1);
        return cloneValue(removed);
      },
      async countDocuments(filter: MongoFilter) {
        return docs.filter((doc) => matchesFilter(doc, filter)).length;
      },
      async deleteMany(filter: MongoFilter) {
        const matches = docs.filter((doc) => matchesFilter(doc, filter));
        const remaining = docs.filter((doc) => !matchesFilter(doc, filter));
        docs.splice(0, docs.length, ...remaining);
        return { deletedCount: matches.length };
      },
      async updateMany(filter: MongoFilter, update: MongoUpdate) {
        let modifiedCount = 0;
        docs.forEach((doc, index) => {
          if (!matchesFilter(doc, filter)) return;
          docs[index] = applyUpdate(cloneValue(doc), update, false);
          modifiedCount += 1;
        });
        return { modifiedCount };
      },
      async distinct(field: string, filter: MongoFilter) {
        const distinctValues = new Set<unknown>();
        docs.filter((doc) => matchesFilter(doc, filter)).forEach((doc) => {
          distinctValues.add(getFieldValue(doc, field));
        });
        return Array.from(distinctValues);
      },
      async bulkWrite(operations: Array<{ updateOne?: { filter: MongoFilter; update: MongoUpdate } }>) {
        let modifiedCount = 0;
        for (const operation of operations) {
          if (!operation.updateOne) continue;
          const index = docs.findIndex((doc) => matchesFilter(doc, operation.updateOne!.filter));
          if (index === -1) continue;
          docs[index] = applyUpdate(cloneValue(docs[index]!), operation.updateOne.update, false);
          modifiedCount += 1;
        }
        return { modifiedCount };
      },
    };
  };

  const mockDb = {
    collection,
  };

  const mockClient = {
    db: vi.fn().mockReturnValue(mockDb),
    close: vi.fn().mockResolvedValue(undefined),
  };

  vi.spyOn(mongoClientModule, 'getMongoDb').mockResolvedValue(mockDb as never);
  vi.spyOn(mongoClientModule, 'getMongoClient').mockResolvedValue(mockClient as never);
};
