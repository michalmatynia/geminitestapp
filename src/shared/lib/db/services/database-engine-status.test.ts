/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAuthDataProviderMock,
  getCmsDataProviderMock,
  getAppDbProviderMock,
  getDatabaseEngineCollectionRouteMapMock,
  getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceRouteMapMock,
  isPrimaryProviderConfiguredMock,
  isRedisProviderConfiguredMock,
  getMongoDbMock,
  getIntegrationDataProviderMock,
  getProductDataProviderMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getAuthDataProviderMock: vi.fn(),
  getCmsDataProviderMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getDatabaseEngineCollectionRouteMapMock: vi.fn(),
  getDatabaseEnginePolicyMock: vi.fn(),
  getDatabaseEngineServiceRouteMapMock: vi.fn(),
  isPrimaryProviderConfiguredMock: vi.fn(),
  isRedisProviderConfiguredMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  getIntegrationDataProviderMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/auth/services/auth-provider', () => ({
  getAuthDataProvider: getAuthDataProviderMock,
}));

vi.mock('@/shared/lib/cms/services/cms-provider', () => ({
  getCmsDataProvider: getCmsDataProviderMock,
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineCollectionRouteMap: getDatabaseEngineCollectionRouteMapMock,
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceRouteMap: getDatabaseEngineServiceRouteMapMock,
  isPrimaryProviderConfigured: isPrimaryProviderConfiguredMock,
  isRedisProviderConfigured: isRedisProviderConfiguredMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/integrations/services/integration-provider', () => ({
  getIntegrationDataProvider: getIntegrationDataProviderMock,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: getProductDataProviderMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import { getDatabaseEngineStatus } from './database-engine-status';

describe('database-engine-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';

    getDatabaseEnginePolicyMock.mockResolvedValue({
      requireExplicitServiceRouting: true,
      requireExplicitCollectionRouting: true,
      allowAutomaticFallback: true,
      allowAutomaticBackfill: true,
      allowAutomaticMigrations: true,
      strictProviderAvailability: true,
    });
    getDatabaseEngineServiceRouteMapMock.mockResolvedValue({
      app: 'mongodb',
      auth: 'redis',
    });
    getDatabaseEngineCollectionRouteMapMock.mockResolvedValue({
      users: 'mongodb',
      jobs: 'redis',
      orphaned: 'mongodb',
    });
    isPrimaryProviderConfiguredMock.mockImplementation((provider: string) => provider === 'mongodb');
    isRedisProviderConfiguredMock.mockReturnValue(false);
    getAppDbProviderMock.mockResolvedValue('mongodb');
    getAuthDataProviderMock.mockRejectedValue(new Error('auth route invalid'));
    getProductDataProviderMock.mockResolvedValue('mongodb');
    getIntegrationDataProviderMock.mockResolvedValue('mongodb');
    getCmsDataProviderMock.mockResolvedValue('mongodb');
    getMongoDbMock.mockResolvedValue({
      listCollections: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([{ name: 'users' }, { name: 'system.profile' }]),
      })),
    });
  });

  it('builds service, collection, and blocking-issue status summaries', async () => {
    const status = await getDatabaseEngineStatus();

    expect(status).toMatchObject({
      policy: expect.objectContaining({
        requireExplicitServiceRouting: true,
        requireExplicitCollectionRouting: true,
        strictProviderAvailability: true,
      }),
      providers: {
        mongodbConfigured: true,
        redisConfigured: false,
      },
      serviceRouteMap: {
        app: 'mongodb',
        auth: 'redis',
        product: 'mongodb',
        integrations: 'mongodb',
        cms: 'mongodb',
      },
      collections: {
        knownCollections: ['users'],
        configuredCount: 3,
        missingExplicitRoutes: [],
        orphanedRoutes: ['jobs', 'orphaned'],
        unavailableConfiguredRoutes: [{ collection: 'jobs', provider: 'redis' }],
      },
    });

    expect(status.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'auth',
          configuredProvider: 'redis',
          unsupportedConfiguredProvider: true,
          unavailableConfiguredProvider: true,
          resolutionError: 'auth route invalid',
        }),
        expect.objectContaining({
          service: 'product',
          missingExplicitRoute: true,
          effectiveProvider: 'mongodb',
        }),
      ])
    );
    expect(status.blockingIssues).toEqual(
      expect.arrayContaining([
        'Service "auth" is routed to Redis, but only MongoDB is supported.',
        'Service "product" has no explicit route while explicit service routing is required.',
        'Service "auth" is routed to an unavailable provider.',
        'Service "auth" resolution failed: auth route invalid',
        '1 collection route(s) target unavailable providers.',
      ])
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns an empty known-collection list when mongo listing fails', async () => {
    getMongoDbMock.mockResolvedValueOnce({
      listCollections: vi.fn(() => ({
        toArray: vi.fn().mockRejectedValue(new Error('list failed')),
      })),
    });

    const status = await getDatabaseEngineStatus();

    expect(status.collections.knownCollections).toEqual([]);
    expect(logWarningMock).toHaveBeenCalledWith(
      '[database-engine-status] Failed to list Mongo collections',
      expect.objectContaining({
        service: 'database-engine-status',
      })
    );
  });
});
