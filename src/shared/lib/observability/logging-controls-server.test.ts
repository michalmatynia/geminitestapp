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
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    process.env['NODE_ENV'] = 'test';
    findProviderForKeyMock.mockResolvedValue(null);
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }

    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('uses default controls without storage reads in development', async () => {
    process.env['NODE_ENV'] = 'development';

    const { isServerLoggingEnabled } = await import('./logging-controls-server');

    await expect(isServerLoggingEnabled('error')).resolves.toBe(true);
    expect(findProviderForKeyMock).not.toHaveBeenCalled();
    expect(getMongoDbMock).not.toHaveBeenCalled();
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
