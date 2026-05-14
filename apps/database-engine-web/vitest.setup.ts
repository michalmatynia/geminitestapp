import 'dotenv/config';
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { afterAll, afterEach, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    startTransition: (scope: () => void) => scope(),
  };
});

process.env['APP_DB_PROVIDER'] = 'mongodb';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
process.env['MONGODB_DB'] = 'test';
delete process.env['DATABASE_URL'];

const baseEnv = { ...process.env };
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalWindow = typeof window !== 'undefined' ? window : undefined;
const originalLocalStorage = originalWindow?.localStorage;
const originalSessionStorage = originalWindow?.sessionStorage;
const originalMatchMedia = originalWindow?.matchMedia;

const quietLogPatterns = [
  'Activity:',
  'completed successfully',
  '[system] [timing]',
  '[queue:',
  'THREE.WARNING: Multiple instances of Three.js being imported.',
];

const shouldSuppressTestLog = (args: unknown[]): boolean => {
  const message = args.filter((arg): arg is string => typeof arg === 'string').join(' ');
  return quietLogPatterns.some((pattern) => message.includes(pattern));
};

/* eslint-disable no-console */
console.log = (...args: unknown[]): void => {
  if (!shouldSuppressTestLog(args)) originalConsoleLog(...args);
};
console.info = (...args: unknown[]): void => {
  if (!shouldSuppressTestLog(args)) originalConsoleInfo(...args);
};
console.warn = (...args: unknown[]): void => {
  if (!shouldSuppressTestLog(args)) originalConsoleWarn(...args);
};
console.error = (...args: unknown[]): void => {
  if (!shouldSuppressTestLog(args)) originalConsoleError(...args);
};
/* eslint-enable no-console */
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

vi.mock('@/shared/lib/db/mongo-client', async () => {
  const { createMongoClientVitestMock } = await import('../../vitest.setup.mongo-mock');
  return createMongoClientVitestMock();
});

vi.mock('@/shared/lib/observability/system-logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/observability/system-logger')>();
  return {
    ...actual,
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
    logSystemError: vi.fn().mockResolvedValue(undefined),
    logActivity: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'mock-activity-id',
        createdAt: new Date().toISOString(),
        ...data,
      }),
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

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => React.createElement('img', { alt: props.alt ?? '' }),
}));

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
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

const createTranslationMock =
  (namespace?: string) =>
  (key: string, values?: Record<string, string | number>): string => {
    let value = namespace ? `${namespace}.${key}` : key;
    if (values) {
      for (const [name, replacement] of Object.entries(values)) {
        value = value.replace(`{${name}}`, String(replacement));
      }
    }
    return value;
  };

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useTranslations: (namespace?: string) => vi.fn(createTranslationMock(namespace)),
  useMessages: () => ({}),
  useLocale: () => 'en',
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('use-intl', () => ({
  useTranslations: (namespace?: string) => vi.fn(createTranslationMock(namespace)),
  useLocale: () => 'en',
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => vi.fn((key: string) => key)),
  getRequestConfig: vi.fn((callback: unknown) => callback),
}));

vi.mock('@/shared/ui/client-only', () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/shared/ui/forms-and-actions.public', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    SelectSimple: ({
      value,
      onValueChange,
      options,
      ariaLabel,
      disabled,
      placeholder,
      id,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      options?: Array<{ label: string; value: string }>;
      ariaLabel?: string;
      disabled?: boolean;
      placeholder?: string;
      id?: string;
    }) =>
      React.createElement(
        'select',
        {
          id,
          'aria-label': ariaLabel,
          value: value ?? '',
          disabled,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(event.target.value),
        },
        placeholder && React.createElement('option', { value: '', disabled: true }, placeholder),
        options?.map((option) =>
          React.createElement('option', { key: option.value, value: option.value }, option.label),
        ),
      ),
  };
});

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: vi.fn(() => ({
      toast: vi.fn(),
      dismiss: vi.fn(),
    })),
  };
});

vi.mock('nextjs-toploader/app', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  useSelectedLayoutSegment: vi.fn(() => null),
  useSelectedLayoutSegments: vi.fn(() => []),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('next/server', () => {
  class MockRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const url =
        typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input;
      super(url, init);
      this.headers.set('origin', 'http://localhost');
    }

    get nextUrl() {
      return new URL(this.url);
    }
  }

  class MockResponse extends Response {
    static override json(data: unknown, init?: ResponseInit) {
      return new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
  }

  return {
    NextRequest: MockRequest,
    NextResponse: MockResponse,
  };
});

const resolveStatus = (error: unknown): number => {
  const candidate = error as { code?: string; name?: string; httpStatus?: number };
  if ((candidate.name === 'AppError' && candidate.code === 'NOT_FOUND') || candidate.code === 'P2025') {
    return 404;
  }
  if (
    (candidate.name === 'AppError' && candidate.code === 'VALIDATION_ERROR') ||
    candidate.code === 'BAD_REQUEST' ||
    candidate.name === 'ValidationError' ||
    candidate.name === 'ZodError'
  ) {
    return 400;
  }
  return candidate.httpStatus ?? 500;
};

vi.mock('@/shared/lib/api/api-handler', () => {
  const parseBody = async (request: Request): Promise<unknown> => {
    const clonedRequest = request.clone ? request.clone() : request;
    if (!clonedRequest.body) return {};
    try {
      return (await clonedRequest.json()) || {};
    } catch {
      return {};
    }
  };

  const buildQuery = (
    request: Request,
    options: { querySchema?: { parse: (query: unknown) => unknown } },
  ) => {
    const query = Object.fromEntries(new URL(request.url, 'http://localhost').searchParams.entries());
    return options.querySchema ? options.querySchema.parse(query) : query;
  };

  const errorResponse = async (error: unknown): Promise<Response> => {
    const { NextResponse } = await import('next/server');
    const candidate = error as { message?: string; code?: string; stack?: string };
    return NextResponse.json(
      {
        error: candidate.message,
        code: candidate.code,
        errorId: 'mock-error-id',
        stack: candidate.stack,
      },
      { status: resolveStatus(error) },
    );
  };

  return {
    apiHandler:
      (
        handler: (request: Request, context: Record<string, unknown>) => Promise<Response>,
        options: { querySchema?: { parse: (query: unknown) => unknown } } = {},
      ) =>
      async (request: Request) => {
        try {
          return await handler(request, {
            requestId: 'database-engine-test-id',
            body: await parseBody(request),
            query: buildQuery(request, options),
            getElapsedMs: () => 0,
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    apiHandlerWithParams:
      (
        handler: (
          request: Request,
          context: Record<string, unknown>,
          params: Record<string, unknown>,
        ) => Promise<Response>,
        options: {
          querySchema?: { parse: (query: unknown) => unknown };
          paramsSchema?: { parse: (params: unknown) => unknown };
        } = {},
      ) =>
      async (
        request: Request,
        context: { params?: Promise<Record<string, unknown>> | Record<string, unknown> },
      ) => {
        try {
          const rawParams = context?.params ?? {};
          const resolvedParams =
            rawParams && typeof (rawParams as Promise<unknown>).then === 'function'
              ? await rawParams
              : rawParams;
          options.paramsSchema?.parse(resolvedParams);
          return await handler(
            request,
            {
              ...context,
              requestId: 'database-engine-test-id',
              body: await parseBody(request),
              query: buildQuery(request, options),
              getElapsedMs: () => 0,
            },
            resolvedParams,
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
    getQueryParams: (request: Request) => new URL(request.url, 'http://localhost').searchParams,
    getRequiredParam: (searchParams: URLSearchParams, name: string) => {
      const value = searchParams.get(name);
      if (!value) throw new Error(`Missing required parameter: ${name}`);
      return value;
    },
    getPaginationParams: (searchParams: URLSearchParams) => ({
      page: Number(searchParams.get('page') ?? '1'),
      pageSize: Number(searchParams.get('pageSize') ?? '20'),
      skip: 0,
    }),
  };
});

const originalFetch = global.fetch;
const createRelativeFetch = (fetchImpl: typeof global.fetch) =>
  function relativeFetch(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://localhost${input}`;
    }
    return fetchImpl(input, init);
  };

const relativeFetch = createRelativeFetch(originalFetch);
global.fetch = relativeFetch;

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: {},
  });
}
if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, 'randomUUID', {
    configurable: true,
    value: () => 'mock-random-uuid',
  });
}

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
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const fallbackMatchMedia = typeof window !== 'undefined' ? window.matchMedia : undefined;

afterEach(async () => {
  try {
    const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
    const mongoDb = await getMongoDb();
    if ((mongoDb as { $resetAll?: () => void })?.$resetAll) {
      (mongoDb as { $resetAll: () => void }).$resetAll();
    }
  } catch {
    // Test suites may replace the mongo client mock.
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
    if (originalMatchMedia && originalWindow.matchMedia !== originalMatchMedia) {
      Object.defineProperty(originalWindow, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else if (!originalMatchMedia && fallbackMatchMedia && originalWindow.matchMedia !== fallbackMatchMedia) {
      Object.defineProperty(originalWindow, 'matchMedia', {
        configurable: true,
        writable: true,
        value: fallbackMatchMedia,
      });
    }
    originalLocalStorage?.clear();
    originalSessionStorage?.clear();
  }

  if (global.fetch !== relativeFetch) {
    global.fetch = relativeFetch;
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
    process.env[key] = value;
  }

  vi.useRealTimers();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
