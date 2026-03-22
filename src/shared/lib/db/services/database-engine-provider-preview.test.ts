/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAppDbProviderMock,
  getCollectionProviderMock,
  getCollectionRouteMapMock,
  getDatabaseEnginePolicyMock,
  getDatabaseEngineStatusMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getAppDbProviderMock: vi.fn(),
  getCollectionProviderMock: vi.fn(),
  getCollectionRouteMapMock: vi.fn(),
  getDatabaseEnginePolicyMock: vi.fn(),
  getDatabaseEngineStatusMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  getCollectionProvider: getCollectionProviderMock,
  getCollectionRouteMap: getCollectionRouteMapMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

vi.mock('./database-engine-status', () => ({
  getDatabaseEngineStatus: getDatabaseEngineStatusMock,
}));

import { getDatabaseEngineProviderPreview } from './database-engine-provider-preview';

describe('database-engine-provider-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseEnginePolicyMock.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    getCollectionRouteMapMock.mockResolvedValue({
      users: 'mongodb',
      cache: 'redis',
    });
    getDatabaseEngineStatusMock.mockResolvedValue({
      collections: {
        knownCollections: ['users', 'orders'],
      },
    });
    getCollectionProviderMock.mockImplementation(async (collection: string) => {
      if (collection === 'orders') return 'mongodb';
      throw new Error(`cannot resolve ${collection}`);
    });
  });

  it('builds preview items from configured routes and resolved providers', async () => {
    getAppDbProviderMock.mockResolvedValue('mongodb');

    const preview = await getDatabaseEngineProviderPreview();

    expect(preview).toMatchObject({
      policy: { requireExplicitServiceRouting: false },
      appProvider: 'mongodb',
      appProviderError: null,
      collections: [
        {
          collection: 'cache',
          configuredProvider: 'redis',
          effectiveProvider: null,
          source: 'error',
          error: 'Collection "cache" is routed to Redis; this operation path supports only MongoDB.',
        },
        {
          collection: 'orders',
          configuredProvider: null,
          effectiveProvider: 'mongodb',
          source: 'app_provider',
          error: null,
        },
        {
          collection: 'users',
          configuredProvider: 'mongodb',
          effectiveProvider: 'mongodb',
          source: 'collection_route',
          error: null,
        },
      ],
    });
  });

  it('surfaces app-provider and collection-resolution failures as preview errors', async () => {
    getAppDbProviderMock.mockRejectedValue(new Error('app unavailable'));
    getCollectionRouteMapMock.mockResolvedValue({});
    getDatabaseEngineStatusMock.mockResolvedValue({
      collections: {
        knownCollections: [],
      },
    });
    getCollectionProviderMock.mockRejectedValue(new Error('collection unavailable'));

    const preview = await getDatabaseEngineProviderPreview({
      collections: ['orders', 'orders', ' ', 'users'],
    });

    expect(preview.appProvider).toBeNull();
    expect(preview.appProviderError).toBe('app unavailable');
    expect(preview.collections).toEqual([
      {
        collection: 'orders',
        configuredProvider: null,
        effectiveProvider: null,
        source: 'error',
        error: 'collection unavailable',
      },
      {
        collection: 'users',
        configuredProvider: null,
        effectiveProvider: null,
        source: 'error',
        error: 'collection unavailable',
      },
    ]);
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(logWarningMock).toHaveBeenCalled();
  });
});
