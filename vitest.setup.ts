import 'dotenv/config';
import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import React from 'react';
import { server } from './src/mocks/server';

// Force MongoDB as the database provider for tests.
process.env['APP_DB_PROVIDER'] = 'mongodb';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
process.env['MONGODB_DB'] = 'test';
delete process.env['DATABASE_URL'];

const THREE_DUPLICATE_IMPORT_WARNING = 'THREE.WARNING: Multiple instances of Three.js being imported.';
const QUIET_TEST_LOG_PATTERNS = [
  'Activity:',
  'completed successfully',
  '[system] [timing]',
  '[getProducts] Total:',
  'Resolved provider:',
  'enqueuePathRun timing',
  '[mock-prompt] returning prompt for value:',
  '[image-studio] delete ',
  'Updated CMS page:',
  'Deleted CMS page:',
  '[queue:',
  '[ai-paths-service]',
];
const QUIET_TEST_LOG_SERVICES = new Set([
  'export-template-repository',
  'products.advanced-filter.mongo',
]);
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalWindow = typeof window !== 'undefined' ? window : undefined;
const originalLocalStorage = originalWindow?.localStorage;
const originalSessionStorage = originalWindow?.sessionStorage;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldSuppressStructuredTestLog = (args: unknown[]): boolean => {
  const [, secondArg] = args;
  const message = args
    .filter((arg): arg is string => typeof arg === 'string')
    .join(' ');

  if (message.includes(THREE_DUPLICATE_IMPORT_WARNING)) {
    return true;
  }

  if (QUIET_TEST_LOG_PATTERNS.some((pattern: string): boolean => message.includes(pattern))) {
    return true;
  }

  if (!isObjectRecord(secondArg)) {
    return false;
  }

  if (secondArg['expected'] === true) {
    return true;
  }

  const service =
    typeof secondArg['service'] === 'string' ? String(secondArg['service']).trim() : '';
  return QUIET_TEST_LOG_SERVICES.has(service);
};

console.log = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) {
    return;
  }
  originalConsoleLog(...args);
};

console.info = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) {
    return;
  }
  originalConsoleInfo(...args);
};

console.warn = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) {
    return;
  }
  originalConsoleError(...args);
};

// Define mock models inside vi.mock factory to avoid hoisting issues
vi.mock('@/shared/lib/db/legacy-sql-client', () => {
  const store: Record<string, any[]> = {};

  const getModelStore = (model: string) => {
    if (!store[model]) store[model] = [];
    return store[model];
  };

  const mockLegacySqlModel = (modelName: string) => ({
    findUnique: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      return Promise.resolve(
        s.find((item) => item.id === args.where.id || item.key === args.where.key) || null
      );
    }),
    findMany: vi.fn().mockImplementation((args) => {
      let s = [...getModelStore(modelName)];
      if (args?.where?.slug?.$in) {
        s = s.filter((item) => args.where.slug.$in.includes(item.slug));
      }
      return Promise.resolve(s);
    }),
    findFirst: vi.fn().mockImplementation((_args) => {
      const s = getModelStore(modelName);
      return Promise.resolve(s[0] || null);
    }),
    create: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      const newItem = {
        id: 'mock-id-' + Math.random().toString(36).slice(2, 9),
        ...args.data,
        createdAt: args.data?.createdAt ? new Date(args.data.createdAt) : new Date(),
        updatedAt: args.data?.updatedAt ? new Date(args.data.updatedAt) : new Date(),
      };
      s.push(newItem);
      return Promise.resolve(newItem);
    }),
    createMany: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      const newItems = args.data.map((d: any) => ({
        id: 'mock-id-' + Math.random().toString(36).slice(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d,
      }));
      s.push(...newItems);
      return Promise.resolve({ count: newItems.length });
    }),
    update: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      const index = s.findIndex((item) => item.id === args.where.id);
      if (index !== -1) {
        s[index] = { ...s[index], ...args.data, updatedAt: new Date() };
        return Promise.resolve(s[index]);
      }
      return Promise.resolve({ id: args.where.id, ...args.data });
    }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      const index = s.findIndex((item) => item.id === args.where.id);
      let deleted = { id: args.where.id };
      if (index !== -1) {
        deleted = s[index];
        s.splice(index, 1);
      }
      return Promise.resolve(deleted);
    }),
    deleteMany: vi.fn().mockImplementation(() => {
      const s = getModelStore(modelName);
      const count = s.length;
      s.length = 0;
      return Promise.resolve({ count });
    }),
    upsert: vi.fn().mockImplementation((args) => {
      const s = getModelStore(modelName);
      const index = s.findIndex((item) => item.id === args.where.id);
      if (index !== -1) {
        s[index] = { ...s[index], ...args.update, updatedAt: new Date() };
        return Promise.resolve(s[index]);
      } else {
        const newItem = {
          id: args.where.id || 'mock-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.create,
        };
        s.push(newItem);
        return Promise.resolve(newItem);
      }
    }),
    count: vi.fn().mockImplementation(() => Promise.resolve(getModelStore(modelName).length)),
  });

  const legacySqlClientMock: any = {
    $transaction: vi.fn().mockImplementation((cb) => cb(proxy)),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $connect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    $on: vi.fn(),
    $use: vi.fn(),
    $resetAll: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };

  const modelMocks: Record<string, any> = {};

  const proxy = new Proxy(legacySqlClientMock, {
    get: (target, prop) => {
      if (prop in target) {
        return target[prop];
      }
      if (typeof prop === 'string' && !prop.startsWith('$')) {
        if (!modelMocks[prop]) {
          modelMocks[prop] = mockLegacySqlModel(prop);
        }
        return modelMocks[prop];
      }
      return undefined;
    },
    has: (target, prop) => {
      if (prop in target) {
        return true;
      }
      if (typeof prop === 'string' && !prop.startsWith('$')) {
        return true;
      }
      return false;
    },
  });

  return {
    default: proxy,
    __esModule: true,
  };
});

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('mongodb'),
  getAppDbProviderSetting: vi.fn().mockResolvedValue('mongodb'),
  invalidateAppDbProviderCache: vi.fn(),
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  getCollectionProvider: vi.fn().mockResolvedValue('mongodb'),
  getCollectionProviderMap: vi.fn().mockResolvedValue({}),
  getCollectionRouteMap: vi.fn().mockResolvedValue({}),
  resolveCollectionProviderForRequest: vi.fn().mockResolvedValue('mongodb'),
  invalidateCollectionProviderMapCache: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => {
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
      cursor = next && typeof next === 'object' && !Array.isArray(next)
        ? (next as Record<string, unknown>)
        : undefined;
    });
  };

  const matchesFilter = (doc: Record<string, unknown>, filter: Record<string, unknown> = {}): boolean =>
    Object.entries(filter).every(([key, rawCondition]: [string, unknown]) => {
      if (key === '$or') {
        return Array.isArray(rawCondition)
          && rawCondition.some(
            (entry: unknown) =>
              !!entry
              && typeof entry === 'object'
              && matchesFilter(doc, entry as Record<string, unknown>)
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
    projection: Record<string, unknown> | undefined
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
    update: Record<string, unknown>
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
          options?: { upsert?: boolean }
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
        }
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
        }
      ),
      findOneAndUpdate: vi.fn().mockImplementation(
        async (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
          options?: { upsert?: boolean }
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
        }
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
          readAll().filter((entry: Record<string, unknown>) => matchesFilter(entry, filter)).length
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
});

// Mock observability server module
vi.mock('@/shared/lib/observability/system-logger', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
    logSystemError: vi.fn().mockResolvedValue(undefined),
    logActivity: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'mock-activity-id',
        createdAt: new Date().toISOString(),
        ...data,
      })
    ),
    getErrorFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
    ErrorSystem: {
      logInfo: vi.fn().mockResolvedValue(undefined),
      logWarning: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
      captureException: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => {
    return React.createElement('img', { alt: props.alt ?? '' });
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    prefetch: _prefetch,
    replace: _replace,
    scroll: _scroll,
    shallow: _shallow,
    locale: _locale,
    legacyBehavior: _legacyBehavior,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: any;
  }) => React.createElement('a', { href, ...props }, children),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock next/server (for NextRequest/NextResponse in API routes)
vi.mock('next/server', () => {
  class MockRequest extends Request {
    constructor(input: RequestInfo, init?: RequestInit) {
      const url = typeof input === 'string' ? `http://localhost${input}` : input;
      super(url, init);
      this.headers.set('origin', 'http://localhost');
    }
    get nextUrl() {
      return new URL(this.url);
    }
  }

  class MockResponse extends Response {
    static override json(data: any, init?: ResponseInit) {
      const res = new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
      return res;
    }
  }
  return {
    NextRequest: MockRequest,
    NextResponse: MockResponse,
  };
});

// Mock apiHandler globally
vi.mock('@/shared/lib/api/api-handler', () => {
  const { NextResponse } = require('next/server');
  return {
    apiHandler:
      (handler: (req: any, ctx: any) => Promise<Response>, options: any) =>
      async (req: Request) => {
        try {
          const clonedReq = req.clone ? req.clone() : req;
          let body = {};
          if (clonedReq.body) {
            try {
              const json = await clonedReq.json();
              body = json || {};
            } catch {
              body = {};
            }
          }
          let query = Object.fromEntries(
            new URL(req.url, 'http://localhost').searchParams.entries()
          );

          if (options?.querySchema) {
            query = options.querySchema.parse(query);
          }

          return await handler(req as any, {
            requestId: 'global-test-id',
            body,
            query,
            getElapsedMs: () => 0,
          });
        } catch (error: any) {
          const status =
            (error.name === 'AppError' && error.code === 'NOT_FOUND') || error.code === 'P2025'
              ? 404
              : (error.name === 'AppError' && error.code === 'VALIDATION_ERROR') ||
                  error.code === 'BAD_REQUEST' ||
                  error.name === 'ValidationError' ||
                  error.name === 'ZodError'
                ? 400
                : error.httpStatus || 500;
          return NextResponse.json(
            { error: error.message, code: error.code, errorId: 'mock-error-id', stack: error.stack },
            { status }
          );
        }
      },
    apiHandlerWithParams:
      (handler: (req: any, ctx: any, params: any) => Promise<Response>, options: any) =>
      async (req: Request, ctx: { params: Promise<any> | any }) => {
        try {
          const clonedReq = req.clone ? req.clone() : req;
          let body = {};
          if (clonedReq.body) {
            try {
              const json = await clonedReq.json();
              body = json || {};
            } catch {
              body = {};
            }
          }
          let query = Object.fromEntries(
            new URL(req.url, 'http://localhost').searchParams.entries()
          );

          if (options?.querySchema) {
            query = options.querySchema.parse(query);
          }

          const context = {
            ...ctx,
            requestId: 'global-test-id',
            body,
            query,
            getElapsedMs: () => 0,
          };
          const resolvedParams =
            ctx?.params && typeof ctx.params.then === 'function'
              ? await ctx.params
              : (ctx?.params ?? {});

          if (options?.paramsSchema) {
            options.paramsSchema.parse(resolvedParams);
          }

          return await handler(req as any, context, resolvedParams);
        } catch (error: any) {
          const status =
            (error.name === 'AppError' && error.code === 'NOT_FOUND') || error.code === 'P2025'
              ? 404
              : (error.name === 'AppError' && error.code === 'VALIDATION_ERROR') ||
                  error.code === 'BAD_REQUEST' ||
                  error.name === 'ValidationError' ||
                  error.name === 'ZodError'
                ? 400
                : error.httpStatus || 500;
          return NextResponse.json(
            { error: error.message, code: error.code, errorId: 'mock-error-id', stack: error.stack },
            { status }
          );
        }
      },
    getQueryParams: (req: any) => new URL(req.url, 'http://localhost').searchParams,
    getRequiredParam: (searchParams: URLSearchParams, name: string) => {
      const val = searchParams.get(name);
      if (!val) throw new Error(`Missing required parameter: ${name}`);
      return val;
    },
    getPaginationParams: (searchParams: URLSearchParams) => ({
      page: Number(searchParams.get('page') ?? '1'),
      pageSize: Number(searchParams.get('pageSize') ?? '20'),
      skip: 0,
    }),
  };
});

// Polyfill fetch to handle relative URLs in tests
const originalFetch = global.fetch;
global.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = `http://localhost${input}`;
  }
  return originalFetch(input, init);
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for global.crypto.randomUUID if missing (for JSDOM)
if (!global.crypto) {
  // @ts-expect-error - crypto is read-only in some environments
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  // @ts-expect-error - polyfill for randomUUID
  global.crypto.randomUUID = () => 'mock-random-uuid';
}

// Polyfill pointer capture methods (Radix UI needs these)
if (typeof window !== 'undefined') {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn();
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  }
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = vi.fn(() => []);
  }
}

// Polyfill for window.matchMedia (GSAP needs this)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'isSecureContext', {
    writable: true,
    value: true,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock SystemLogsProvider to always provide static test data
vi.mock('@/features/observability/context/SystemLogsContext', () => {
  const systemLogsMock = {
    logsQuery: {
      isPending: false,
      data: {
        logs: [
          {
            id: '1',
            level: 'error',
            message: 'Test Error',
            createdAt: new Date().toISOString(),
            source: 'api',
          },
          {
            id: '2',
            level: 'info',
            message: 'Test Info',
            createdAt: new Date().toISOString(),
            source: 'client',
          },
        ],
        total: 2,
      },
    },
    metricsQuery: {
      isPending: false,
      data: {
        metrics: {
          total: 2,
          last24Hours: 1,
          last7Days: 2,
          levels: { error: 1, warn: 0, info: 1 },
          topSources: [{ source: 'api', count: 1 }],
          topPaths: [{ path: '/api/test', count: 1 }],
          generatedAt: new Date().toISOString(),
        },
      },
    },
    filterFields: [],
    level: 'all',
    query: '',
    source: '',
    fromDate: null,
    toDate: null,
    handleFilterChange: vi.fn(),
    handleResetFilters: vi.fn(),
    logs: [
      {
        id: '1',
        level: 'error',
        message: 'Test Error',
        createdAt: new Date().toISOString(),
        source: 'api',
      },
      {
        id: '2',
        level: 'info',
        message: 'Test Info',
        createdAt: new Date().toISOString(),
        source: 'client',
      },
    ],
    total: 2,
    totalPages: 1,
    page: 1,
    setPage: vi.fn(),
    interpretLogMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
    logInterpretations: {},
    isClearLogsConfirmOpen: false,
    setIsClearLogsConfirmOpen: vi.fn(),
    handleClearLogs: vi.fn(),
    clearLogsMutation: {
      mutateAsync: vi.fn().mockResolvedValue(true),
      isPending: false,
    },
    toast: vi.fn(),
    diagnostics: [],
    diagnosticsUpdatedAt: null,
    mongoDiagnosticsQuery: {
      refetch: vi.fn(),
      isLoading: false,
    },
    rebuildIndexesMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
    confirmAction: vi.fn(),
    ConfirmationModal: () => null,
    setIsRebuildIndexesConfirmOpen: vi.fn(),
    handleRebuildMongoIndexes: vi.fn(),
    insightsQuery: {
      isLoading: false,
      data: { insights: [] },
    },
    runInsightMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
    metrics: {
      total: 2,
      last24Hours: 1,
      last7Days: 2,
      levels: { error: 1, warn: 0, info: 1 },
      topSources: [{ source: 'api', count: 1 }],
      topPaths: [{ path: '/api/test', count: 1 }],
      generatedAt: new Date().toISOString(),
    },
    levels: { error: 1, warn: 0, info: 1 },
    logsJson: '[]',
  };

  return {
    SystemLogsProvider: ({ children }: any) => children,
    useSystemLogsState: vi.fn(() => systemLogsMock),
    useSystemLogsActions: vi.fn(() => systemLogsMock),
  };
});

import { http, HttpResponse } from 'msw';

/**
 * MSW Server Setup for Vitest
 * Establishes request mocking for all tests
 */
beforeAll(() => {
  server.use(
    http.get('http://localhost/api/settings/lite', () => {
      return HttpResponse.json([
        {
          key: 'auth_user_pages',
          value: JSON.stringify({ allowSignup: true, allowSocialLogin: true }),
        },
      ]);
    }),
    http.get('http://localhost/api/settings', () => {
      return HttpResponse.json([
        {
          key: 'auth_user_pages',
          value: JSON.stringify({ allowSignup: true, allowSocialLogin: true }),
        },
      ]);
    })
  );
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

afterEach(async () => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();

  // Reset legacy SQL mock store
  try {
    const { default: legacySqlClient } = await import('@/shared/lib/db/legacy-sql-client');
    if ((legacySqlClient as any).$resetAll) {
      await (legacySqlClient as any).$resetAll();
    }
  } catch {
    // Tests that intentionally unmock the removed legacy SQL client should still clean up safely.
  }

  try {
    const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
    const mongoDb = await getMongoDb();
    if ((mongoDb as any)?.$resetAll) {
      (mongoDb as any).$resetAll();
    }
  } catch {
    // Some suites replace the mongo client entirely; global cleanup must stay optional.
  }

  if (originalWindow) {
    if (globalThis.window !== originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
    if (originalLocalStorage && originalWindow.localStorage !== originalLocalStorage) {
      Object.defineProperty(originalWindow, 'localStorage', {
        configurable: true,
        writable: true,
        value: originalLocalStorage,
      });
    }
    if (originalSessionStorage && originalWindow.sessionStorage !== originalSessionStorage) {
      Object.defineProperty(originalWindow, 'sessionStorage', {
        configurable: true,
        writable: true,
        value: originalSessionStorage,
      });
    }
    try {
      originalLocalStorage?.clear();
    } catch {
      // ignore storage cleanup failures
    }
    try {
      originalSessionStorage?.clear();
    } catch {
      // ignore storage cleanup failures
    }
  }

  try {
    const { __resetQueuedProductOpsState } = await import(
      '@/features/products/state/queued-product-ops'
    );
    __resetQueuedProductOpsState?.();
  } catch {
    // ignore cleanup for non-browser test environments
  }

  // Avoid leaking fake timers between tests.
  vi.useRealTimers();
});

afterAll(() => {
  // Clean up and stop the server after all tests complete
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  server.close();
});
