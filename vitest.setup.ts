import "dotenv/config";
import "@testing-library/jest-dom/vitest";
import { vi, beforeAll, afterEach, afterAll } from "vitest";
import React from "react";
import { server } from "./src/mocks/server";

// Force Prisma as the database provider for tests to ensure consistency with cleanup logic
process.env['APP_DB_PROVIDER'] = "prisma";
delete process.env['MONGODB_URI'];

vi.mock("@/shared/lib/db/prisma");

vi.mock("@/shared/lib/db/app-db-provider", () => ({
  getAppDbProvider: vi.fn().mockResolvedValue("prisma"),
  getAppDbProviderSetting: vi.fn().mockResolvedValue("prisma"),
  APP_DB_PROVIDER_SETTING_KEY: "app_db_provider",
}));

// Mock observability server module
vi.mock('@/features/observability/server', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
    logSystemError: vi.fn().mockResolvedValue(undefined),
    logActivity: vi.fn().mockImplementation((data) => Promise.resolve({
      id: 'mock-activity-id',
      createdAt: new Date().toISOString(),
      ...data
    })),
    getErrorFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
    ErrorSystem: {
      logInfo: vi.fn().mockResolvedValue(undefined),
      logWarning: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
      captureException: vi.fn().mockResolvedValue(undefined),
    }
  };
});

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string }) => {
    return React.createElement("img", { alt: props.alt ?? "" });
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: any }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/server (for NextRequest/NextResponse in API routes)
vi.mock("next/server", () => {
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
      console.log('[DEBUG] MockResponse.json status:', res.status);
      return res;
    }
  }
  return {
    NextRequest: MockRequest,
    NextResponse: MockResponse,
  };
});

vi.mock("next/server.js", () => {
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
      console.log('[DEBUG] MockResponse.json status:', res.status);
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
    apiHandler: (handler: any, options: any) => async (req: any) => {
      try {
        const clonedReq = req.clone ? req.clone() : req;
        const body = clonedReq.body && typeof clonedReq.json === 'function' ? await clonedReq.json().catch(() => ({})) : {};
        let query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries());
        
        if (options?.querySchema) {
          query = options.querySchema.parse(query);
        }

        return await handler(req, { requestId: 'global-test-id', body, query, getElapsedMs: () => 0 });
      } catch (error: any) {
        console.log('[DEBUG] apiHandler mock caught error:', { name: error.name, code: error.code, message: error.message });
        const status = 
          (error.name === 'AppError' && error.code === 'NOT_FOUND') || 
          (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025')
            ? 404 : (
          (error.name === 'AppError' && error.code === 'VALIDATION_ERROR') || 
          error.code === 'BAD_REQUEST' || 
          error.name === 'PrismaClientValidationError' ||
          error.name === 'ZodError'
            ? 400 : (error.httpStatus || 500));
        return NextResponse.json(
          { error: error.message, code: error.code, errorId: 'mock-error-id' },
          { status }
        );
      }
    },
    apiHandlerWithParams: (handler: any, options: any) => async (req: any, ctx: any) => {
      try {
        const clonedReq = req.clone ? req.clone() : req;
        const body = clonedReq.body && typeof clonedReq.json === 'function' ? await clonedReq.json().catch(() => ({})) : {};
        let query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries());
        
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
        const resolvedParams = ctx?.params && typeof ctx.params.then === 'function' ? await ctx.params : (ctx?.params ?? {});
        
        if (options?.paramsSchema) {
          options.paramsSchema.parse(resolvedParams);
        }

        return await handler(req, context, resolvedParams);
      } catch (error: any) {
        console.log('[DEBUG] apiHandlerWithParams mock caught error:', { name: error.name, code: error.code, message: error.message });
        const status = 
          (error.name === 'AppError' && error.code === 'NOT_FOUND') || 
          (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025')
            ? 404 : (
          (error.name === 'AppError' && error.code === 'VALIDATION_ERROR') || 
          error.code === 'BAD_REQUEST' || 
          error.name === 'PrismaClientValidationError' ||
          error.name === 'ZodError'
            ? 400 : (error.httpStatus || 500));
        return NextResponse.json(
          { error: error.message, code: error.code, errorId: 'mock-error-id' },
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

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Polyfill fetch to handle relative URLs in tests
const originalFetch = global.fetch;
global.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = `http://localhost${input}`;
  }
  return originalFetch(input, init);
};

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

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
  global.crypto.randomUUID = () => "mock-random-uuid";
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
  Object.defineProperty(window, "matchMedia", {
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
vi.mock('@/features/observability/context/SystemLogsContext', () => ({
  SystemLogsProvider: ({ children }: any) => children,
  useSystemLogsContext: vi.fn(() => ({
    logsQuery: {
      isPending: false,
      data: {
        logs: [
          { id: '1', level: 'error', message: 'Test Error', createdAt: new Date().toISOString(), source: 'api' },
          { id: '2', level: 'info', message: 'Test Info', createdAt: new Date().toISOString(), source: 'client' },
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
      { id: '1', level: 'error', message: 'Test Error', createdAt: new Date().toISOString(), source: 'api' },
      { id: '2', level: 'info', message: 'Test Info', createdAt: new Date().toISOString(), source: 'client' },
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
  })),
}));

import { http, HttpResponse } from 'msw';

/**
 * MSW Server Setup for Vitest
 * Establishes request mocking for all tests
 */
beforeAll(() => {
  server.use(
    http.get('http://localhost/api/settings/lite', () => {
      return HttpResponse.json([
        { key: 'auth_user_pages', value: JSON.stringify({ allowSignup: true, allowSocialLogin: true }) },
      ]);
    }),
    http.get('http://localhost/api/settings', () => {
      return HttpResponse.json([
        { key: 'auth_user_pages', value: JSON.stringify({ allowSignup: true, allowSocialLogin: true }) },
      ]);
    })
  );
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: "warn",
  });
});

afterEach(async () => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
  
  // Reset Prisma mock store
  const { default: prisma } = await import("@/shared/lib/db/prisma");
  if ((prisma as any).$resetAll) {
    (prisma as any).$resetAll();
  }
});

afterAll(() => {
  // Clean up and stop the server after all tests complete
  server.close();
});