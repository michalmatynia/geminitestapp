import { vi } from 'vitest';

export const createMongoClientVitestMock = () => {
  const cloneValue = <T>(value: T): T =>
    typeof structuredClone === 'function'
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);

  const collectionStore = new Map<string, Record<string, unknown>[]>();

  const ensureCollection = (name: string): Record<string, unknown>[] => {
    const existing = collectionStore.get(name);
    if (existing) return existing;
    const created: Record<string, unknown>[] = [];
    collectionStore.set(name, created);
    return created;
  };

  const getValueByPath = (doc: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((current: unknown, segment: string) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, doc);

  const toComparableValue = (value: unknown): number | string | null => {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    return null;
  };

  const setValueByPath = (doc: Record<string, unknown>, path: string, value: unknown): void => {
    const segments = path.split('.');
    let cursor: Record<string, unknown> = doc;
    segments.forEach((segment: string, index: number) => {
      if (index === segments.length - 1) {
        cursor[segment] = value;
        return;
      }
      const next = cursor[segment];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    });
  };

  const deleteValueByPath = (doc: Record<string, unknown>, path: string): void => {
    const segments = path.split('.');
    let cursor: Record<string, unknown> | undefined = doc;
    segments.forEach((segment: string, index: number) => {
      if (!cursor) return;
      if (index === segments.length - 1) {
        delete cursor[segment];
        return;
      }
      const next = cursor[segment];
      cursor =
        next && typeof next === 'object' && !Array.isArray(next)
          ? (next as Record<string, unknown>)
          : undefined;
    });
  };

  const matchesFilter = (
    doc: Record<string, unknown>,
    filter: Record<string, unknown> = {},
  ): boolean =>
    Object.entries(filter).every(([key, rawCondition]: [string, unknown]) => {
      if (key === '$or') {
        return (
          Array.isArray(rawCondition)
          && rawCondition.some(
            (entry: unknown) =>
              !!entry
              && typeof entry === 'object'
              && matchesFilter(doc, entry as Record<string, unknown>)
          )
        );
      }

      const actual = getValueByPath(doc, key);
      if (rawCondition && typeof rawCondition === 'object' && !Array.isArray(rawCondition)) {
        const condition = rawCondition as Record<string, unknown>;

        if ('$in' in condition) {
          return Array.isArray(condition['$in']) && condition['$in'].includes(actual);
        }
        if ('$ne' in condition) {
          return actual !== condition['$ne'];
        }
        if ('$exists' in condition) {
          return Boolean(condition['$exists']) ? actual !== undefined : actual === undefined;
        }
        if ('$gte' in condition) {
          const actualComparable = toComparableValue(actual);
          const lowerBoundComparable = toComparableValue(condition['$gte']);
          if (
            actualComparable === null
            || lowerBoundComparable === null
            || actualComparable < lowerBoundComparable
          ) {
            return false;
          }
        }
        if ('$lte' in condition) {
          const actualComparable = toComparableValue(actual);
          const upperBoundComparable = toComparableValue(condition['$lte']);
          if (
            actualComparable === null
            || upperBoundComparable === null
            || actualComparable > upperBoundComparable
          ) {
            return false;
          }
        }
      }

      return actual === rawCondition;
    });

  const applyProjection = (
    doc: Record<string, unknown>,
    projection: Record<string, unknown> | undefined,
  ): Record<string, unknown> => {
    if (!projection) return cloneValue(doc);
    const includedKeys = Object.entries(projection)
      .filter(([, include]: [string, unknown]) => Boolean(include))
      .map(([key]) => key);
    if (includedKeys.length === 0) return cloneValue(doc);
    const projected: Record<string, unknown> = {};
    includedKeys.forEach((key: string) => {
      const value = getValueByPath(doc, key);
      if (value !== undefined) {
        setValueByPath(projected, key, cloneValue(value));
      }
    });
    return projected;
  };

  const applyUpdate = (
    doc: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Record<string, unknown> => {
    const next = cloneValue(doc);

    if ('$set' in update && update['$set'] && typeof update['$set'] === 'object') {
      Object.entries(update['$set'] as Record<string, unknown>).forEach(([key, value]) => {
        setValueByPath(next, key, cloneValue(value));
      });
    }

    if ('$unset' in update && update['$unset'] && typeof update['$unset'] === 'object') {
      Object.keys(update['$unset'] as Record<string, unknown>).forEach((key: string) => {
        deleteValueByPath(next, key);
      });
    }

    const hasOperators = Object.keys(update).some((key: string) => key.startsWith('$'));
    if (!hasOperators) {
      Object.assign(next, cloneValue(update));
    }

    return next;
  };

  const createCursor = (docs: Record<string, unknown>[]) => {
    let working = docs.map((doc: Record<string, unknown>) => cloneValue(doc));
    let projection: Record<string, unknown> | undefined;

    const cursor = {
      sort(sortSpec: Record<string, 1 | -1>) {
        const entries = Object.entries(sortSpec ?? {});
        working = [...working].sort((left: Record<string, unknown>, right: Record<string, unknown>) => {
          for (const [field, direction] of entries) {
            const a = toComparableValue(getValueByPath(left, field));
            const b = toComparableValue(getValueByPath(right, field));
            if (a === b) continue;
            if (a === null) return direction === 1 ? -1 : 1;
            if (b === null) return direction === 1 ? 1 : -1;
            return a < b ? -direction : direction;
          }
          return 0;
        });
        return cursor;
      },
      skip(value: number) {
        working = working.slice(Math.max(0, value));
        return cursor;
      },
      limit(value: number) {
        working = working.slice(0, Math.max(0, value));
        return cursor;
      },
      project(nextProjection: Record<string, unknown>) {
        projection = nextProjection;
        return cursor;
      },
      async toArray() {
        return working.map((doc: Record<string, unknown>) => applyProjection(doc, projection));
      },
    };

    return cursor;
  };

  const createCollection = (name: string) => {
    const readAll = (): Record<string, unknown>[] => ensureCollection(name);

    return {
      findOne: vi.fn().mockImplementation(async (filter: Record<string, unknown> = {}) => {
        const doc = readAll().find((entry: Record<string, unknown>) => matchesFilter(entry, filter));
        return doc ? cloneValue(doc) : null;
      }),
      find: vi.fn().mockImplementation((filter: Record<string, unknown> = {}) => {
        const docs = readAll().filter((entry: Record<string, unknown>) => matchesFilter(entry, filter));
        return createCursor(docs);
      }),
      insertOne: vi.fn().mockImplementation(async (doc: Record<string, unknown>) => {
        readAll().push(cloneValue(doc));
        return { acknowledged: true, insertedId: doc['id'] ?? doc['_id'] ?? null };
      }),
      insertMany: vi.fn().mockImplementation(async (docs: Record<string, unknown>[]) => {
        docs.forEach((doc: Record<string, unknown>) => readAll().push(cloneValue(doc)));
        return { acknowledged: true, insertedCount: docs.length };
      }),
      updateOne: vi.fn().mockImplementation(
        async (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
          options?: { upsert?: boolean },
        ) => {
          const docs = readAll();
          const index = docs.findIndex((entry: Record<string, unknown>) => matchesFilter(entry, filter));
          if (index >= 0) {
            docs[index] = applyUpdate(docs[index]!, update);
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
          }
          if (options?.upsert) {
            const created = applyUpdate(cloneValue(filter), update);
            docs.push(created);
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        },
      ),
      updateMany: vi.fn().mockImplementation(
        async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
          const docs = readAll();
          let modifiedCount = 0;
          docs.forEach((entry: Record<string, unknown>, index: number) => {
            if (!matchesFilter(entry, filter)) return;
            docs[index] = applyUpdate(entry, update);
            modifiedCount += 1;
          });
          return { acknowledged: true, modifiedCount, matchedCount: modifiedCount };
        },
      ),
      findOneAndUpdate: vi.fn().mockImplementation(
        async (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
          options?: { upsert?: boolean },
        ) => {
          const docs = readAll();
          const index = docs.findIndex((entry: Record<string, unknown>) => matchesFilter(entry, filter));
          if (index >= 0) {
            docs[index] = applyUpdate(docs[index]!, update);
            return cloneValue(docs[index]);
          }
          if (options?.upsert) {
            const created = applyUpdate(cloneValue(filter), update);
            docs.push(created);
            return cloneValue(created);
          }
          return null;
        },
      ),
      findOneAndDelete: vi.fn().mockImplementation(async (filter: Record<string, unknown>) => {
        const docs = readAll();
        const index = docs.findIndex((entry: Record<string, unknown>) => matchesFilter(entry, filter));
        if (index < 0) return null;
        const [deleted] = docs.splice(index, 1);
        return deleted ? cloneValue(deleted) : null;
      }),
      deleteOne: vi.fn().mockImplementation(async (filter: Record<string, unknown>) => {
        const docs = readAll();
        const index = docs.findIndex((entry: Record<string, unknown>) => matchesFilter(entry, filter));
        if (index < 0) {
          return { acknowledged: true, deletedCount: 0 };
        }
        docs.splice(index, 1);
        return { acknowledged: true, deletedCount: 1 };
      }),
      deleteMany: vi.fn().mockImplementation(async (filter: Record<string, unknown> = {}) => {
        const docs = readAll();
        const remaining = docs.filter((entry: Record<string, unknown>) => !matchesFilter(entry, filter));
        const deletedCount = docs.length - remaining.length;
        collectionStore.set(name, remaining);
        return { acknowledged: true, deletedCount };
      }),
      countDocuments: vi.fn().mockImplementation(
        async (filter: Record<string, unknown> = {}) =>
          readAll().filter((entry: Record<string, unknown>) => matchesFilter(entry, filter)).length,
      ),
      createIndex: vi.fn().mockResolvedValue('index-name'),
    };
  };

  const mockMongoDb = {
    collection: vi.fn().mockImplementation((name: string) => createCollection(name)),
    $resetAll: () => {
      collectionStore.clear();
    },
  };
  const mockClient = {
    connect: vi.fn().mockReturnThis(),
    db: vi.fn().mockReturnValue(mockMongoDb),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getMongoClient: vi.fn().mockResolvedValue(mockClient),
    getMongoDb: vi.fn().mockResolvedValue(mockMongoDb),
  };
};
