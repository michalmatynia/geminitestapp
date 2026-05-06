/**
 * @vitest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { findProviderForKeyMock, getMongoDbMock, reportObservabilityInternalErrorMock } = vi.hoisted(
  () => ({
    findProviderForKeyMock: vi.fn(),
    getMongoDbMock: vi.fn(),
    reportObservabilityInternalErrorMock: vi.fn(),
  })
);

vi.mock('@/shared/lib/db/settings-registry', () => ({
  findProviderForKey: findProviderForKeyMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/internal-observability-fallback', () => ({
  reportObservabilityInternalError: reportObservabilityInternalErrorMock,
}));

describe('logging-controls-server', () => {
  const originalMongoUri = process.env['MONGODB_URI'];
  const originalMongoLocalUri = process.env['MONGODB_LOCAL_URI'];
  const originalMongoCloudUri = process.env['MONGODB_CLOUD_URI'];
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalDevRuntimeLoggingControls =
    process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    delete process.env['MONGODB_LOCAL_URI'];
    delete process.env['MONGODB_CLOUD_URI'];
    process.env['NODE_ENV'] = 'test';
    delete process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'];
    findProviderForKeyMock.mockResolvedValue(null);
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }

    if (originalMongoLocalUri === undefined) {
      delete process.env['MONGODB_LOCAL_URI'];
    } else {
      process.env['MONGODB_LOCAL_URI'] = originalMongoLocalUri;
    }

    if (originalMongoCloudUri === undefined) {
      delete process.env['MONGODB_CLOUD_URI'];
    } else {
      process.env['MONGODB_CLOUD_URI'] = originalMongoCloudUri;
    }

    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }

    if (originalDevRuntimeLoggingControls === undefined) {
      delete process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'];
    } else {
      process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'] = originalDevRuntimeLoggingControls;
    }
  });

  it('uses default controls without storage reads in development when dev runtime controls are disabled', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'] = 'false';

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('error')).resolves.toBe(true);
    expect(findProviderForKeyMock).not.toHaveBeenCalled();
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('honors stored controls in development when Mongo settings are available', async () => {
    process.env['NODE_ENV'] = 'development';
    const findOneMock = vi.fn().mockResolvedValue({
      _id: 'observability_error_logging_enabled',
      key: 'observability_error_logging_enabled',
      value: 'false',
    });
    const collectionMock = vi.fn().mockReturnValue({ findOne: findOneMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('error')).resolves.toBe(false);
    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findOneMock).toHaveBeenCalledWith({
      $or: [
        { _id: 'observability_error_logging_enabled' },
        { key: 'observability_error_logging_enabled' },
      ],
    });
  });

  it('honors stored controls in development when only a local Mongo source is configured', async () => {
    process.env['NODE_ENV'] = 'development';
    delete process.env['MONGODB_URI'];
    process.env['MONGODB_LOCAL_URI'] = 'mongodb://localhost:27017/test';
    const findOneMock = vi.fn().mockResolvedValue({
      _id: 'observability_activity_logging_enabled',
      key: 'observability_activity_logging_enabled',
      value: 'false',
    });
    const collectionMock = vi.fn().mockReturnValue({ findOne: findOneMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('activity')).resolves.toBe(false);
    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findOneMock).toHaveBeenCalledWith({
      $or: [
        { _id: 'observability_activity_logging_enabled' },
        { key: 'observability_activity_logging_enabled' },
      ],
    });
  });

  it('silently falls back to default logging controls on transient mongo connectivity failures', async () => {
    const transientError = new Error(
      'querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net'
    );
    transientError.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(transientError);

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('error')).resolves.toBe(true);
    expect(reportObservabilityInternalErrorMock).not.toHaveBeenCalled();
  });

  it('reports unexpected logging-control read failures before falling back to defaults', async () => {
    const error = new Error('settings provider schema mismatch');
    getMongoDbMock.mockRejectedValue(error);

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('error')).resolves.toBe(true);
    expect(reportObservabilityInternalErrorMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        source: 'observability.logging-controls-server',
        action: 'isServerLoggingEnabled',
        type: 'error',
      })
    );
  });
});
