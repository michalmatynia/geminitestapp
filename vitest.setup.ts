import 'dotenv/config';
import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import React from 'react';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { server } from './src/mocks/server';

// Force MongoDB as the database provider for tests.
process.env['APP_DB_PROVIDER'] = 'mongodb';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
process.env['MONGODB_DB'] = 'test';
delete process.env['DATABASE_URL'];
const baseEnv = { ...process.env };

type KangurClientErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

const createKangurClientErrorMocks = () => {
  const logKangurClientErrorMock = vi.fn();
  const trackKangurClientEventMock = vi.fn();
  const reportKangurClientErrorMock = vi.fn();
  const setKangurClientObservabilityContextMock = vi.fn();
  const clearKangurClientObservabilityContextMock = vi.fn();

  const withKangurClientError = async <T>(
    _report: unknown,
    task: () => Promise<T>,
    options: KangurClientErrorHandlingOptions<T>
  ): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => T)()
        : options.fallback;
    }
  };

  const withKangurClientErrorSync = <T>(
    _report: unknown,
    task: () => T,
    options: KangurClientErrorHandlingOptions<T>
  ): T => {
    try {
      return task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => T)()
        : options.fallback;
    }
  };

  return {
    logKangurClientErrorMock,
    trackKangurClientEventMock,
    reportKangurClientErrorMock,
    setKangurClientObservabilityContextMock,
    clearKangurClientObservabilityContextMock,
    withKangurClientError,
    withKangurClientErrorSync,
  };
};

const kangurClientErrorMocks = createKangurClientErrorMocks();

declare global {
  // eslint-disable-next-line no-var
  var __kangurClientErrorMocks: () => typeof kangurClientErrorMocks;
  // eslint-disable-next-line no-var
  var __kangurAgeGroupFocusMock: () => typeof kangurAgeGroupFocusMock;
}

globalThis.__kangurClientErrorMocks = () => kangurClientErrorMocks;

const kangurAgeGroupFocusMock = {
  ageGroup: DEFAULT_KANGUR_AGE_GROUP,
  setAgeGroup: vi.fn(),
  ageGroupKey: null as string | null,
};

globalThis.__kangurAgeGroupFocusMock = () => kangurAgeGroupFocusMock;

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
  'Kangur API request failed: 405 Method Not Allowed (/api/kangur/progress)',
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
const originalMatchMedia = originalWindow?.matchMedia;

if (typeof HTMLMediaElement !== 'undefined') {
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
}

if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon !== 'function') {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => true),
  });
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const matchesQuietTestLogPattern = (value: unknown): boolean =>
  typeof value === 'string'
  && QUIET_TEST_LOG_PATTERNS.some((pattern: string): boolean => value.includes(pattern));

const shouldSuppressStructuredTestLog = (args: unknown[]): boolean => {
  const [, secondArg] = args;
  const message = args
    .filter((arg): arg is string => typeof arg === 'string')
    .join(' ');

  if (message.includes(THREE_DUPLICATE_IMPORT_WARNING)) {
    return true;
  }

  if (matchesQuietTestLogPattern(message)) {
    return true;
  }

  if (!isObjectRecord(secondArg)) {
    return false;
  }

  if (
    matchesQuietTestLogPattern(secondArg['message'])
    || (isObjectRecord(secondArg['error'])
      && matchesQuietTestLogPattern(secondArg['error']['message']))
  ) {
    return true;
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

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('mongodb'),
  getAppDbProviderSetting: vi.fn().mockResolvedValue('mongodb'),
  invalidateAppDbProviderCache: vi.fn(),
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  KangurAgeGroupFocusProvider: ({ children }: { children: React.ReactNode }) => children,
  useKangurAgeGroupFocus: () => kangurAgeGroupFocusMock,
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  getCollectionProvider: vi.fn().mockResolvedValue('mongodb'),
  getCollectionProviderMap: vi.fn().mockResolvedValue({}),
  getCollectionRouteMap: vi.fn().mockResolvedValue({}),
  resolveCollectionProviderForRequest: vi.fn().mockResolvedValue('mongodb'),
  invalidateCollectionProviderMapCache: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', async () => {
  const { createMongoClientVitestMock } = await import('./vitest.setup.mongo-mock');
  return createMongoClientVitestMock();
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

// Mock next-intl
vi.mock('next-intl', () => {
  const React = require('react');
  const plMessages = require('./src/i18n/messages/pl.json');
  return {
    NextIntlClientProvider: ({ children }: { children: React.ReactNode; messages?: any }) =>
      React.createElement(React.Fragment, null, children),
    useTranslations: (namespace?: string) => vi.fn((key: string, values?: any) => {
      const getNested = (obj: any, path: string) => {
        return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
      };
      const messages = plMessages;
      // Try resolving as an absolute key first, then relative to namespace
      let value = getNested(messages, key) || getNested(namespace ? getNested(messages, namespace) : messages, key);
      
      if (typeof value === 'string' && values) {
        Object.keys(values).forEach((k) => {
          value = value.replace(`{${k}}`, values[k]);
        });
      }
      return value || (namespace ? `${namespace}.${key}` : key);
    }),
    useMessages: () => plMessages,
    useLocale: () => 'pl',
    usePathname: vi.fn(() => '/'),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    })),
  };
});

// Mock use-intl to handle inlined next-intl bypassing the global mock
vi.mock('use-intl', () => {
  const plMessages = require('./src/i18n/messages/pl.json');
  return {
    useTranslations: (namespace?: string) => vi.fn((key: string, values?: any) => {
      const getNested = (obj: any, path: string) => {
        return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
      };
      const messages = plMessages;
      // Try resolving as an absolute key first, then relative to namespace
      let value = getNested(messages, key) || getNested(namespace ? getNested(messages, namespace) : messages, key);
      
      if (typeof value === 'string' && values) {
        Object.keys(values).forEach((k) => {
          value = value.replace(`{${k}}`, values[k]);
        });
      }
      return value || (namespace ? `${namespace}.${key}` : key);
    }),
    useLocale: () => 'pl',
  };
});

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => vi.fn((key: string) => key)),
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
  useParams: vi.fn(() => ({})),
  useSelectedLayoutSegment: vi.fn(() => null),
  useSelectedLayoutSegments: vi.fn(() => []),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
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
const createRelativeFetch = (fetchImpl: typeof global.fetch) =>
  function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://localhost${input}`;
    }
    return fetchImpl(input, init);
  };
const relativeFetch = createRelativeFetch(originalFetch);
let mswRelativeFetch = relativeFetch;
global.fetch = relativeFetch;

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
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
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
const fallbackMatchMedia = typeof window !== 'undefined' ? window.matchMedia : undefined;

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
  mswRelativeFetch = global.fetch;
  if (typeof window !== 'undefined') {
    window.fetch = global.fetch;
  }
});

afterEach(async () => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();

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
    if (originalMatchMedia) {
      if (originalWindow.matchMedia !== originalMatchMedia) {
        Object.defineProperty(originalWindow, 'matchMedia', {
          configurable: true,
          writable: true,
          value: originalMatchMedia,
        });
      }
    } else if (fallbackMatchMedia) {
      if (originalWindow.matchMedia !== fallbackMatchMedia) {
        Object.defineProperty(originalWindow, 'matchMedia', {
          configurable: true,
          writable: true,
          value: fallbackMatchMedia,
        });
      }
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

  if (global.fetch !== mswRelativeFetch) {
    global.fetch = mswRelativeFetch;
  }
  if (typeof window !== 'undefined' && window.fetch !== global.fetch) {
    window.fetch = global.fetch;
  }

  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(baseEnv)) {
    process.env[key] = value as string;
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
