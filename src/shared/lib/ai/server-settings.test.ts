import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, captureExceptionMock, logWarningMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import { getSettingValue } from '@/shared/lib/ai/server-settings';

describe('getSettingValue', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
    captureExceptionMock.mockReset();
    logWarningMock.mockReset();
    delete process.env['MONGODB_URI'];
  });

  it('returns null without touching mongo when the connection string is missing', async () => {
    await expect(getSettingValue('feature_flag')).resolves.toBeNull();
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('reads string settings from mongo when configured', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const findOne = vi.fn().mockResolvedValue({ value: 'enabled' });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne }),
    });

    await expect(getSettingValue('feature_flag')).resolves.toBe('enabled');
    expect(findOne).toHaveBeenCalledWith({
      $or: [{ _id: 'feature_flag' }, { key: 'feature_flag' }],
    });
  });

  it('captures and downgrades mongo failures to null', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const error = new Error('mongo unavailable');
    getMongoDbMock.mockRejectedValue(error);

    await expect(getSettingValue('feature_flag')).resolves.toBeNull();
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(logWarningMock).toHaveBeenCalledWith('Mongo setting fetch failed for feature_flag', {
      service: 'ai-server-settings',
      key: 'feature_flag',
      error,
    });
  });

  it('silently downgrades transient mongo connectivity failures to null', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const error = new Error('querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);

    await expect(getSettingValue('feature_flag')).resolves.toBeNull();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logWarningMock).not.toHaveBeenCalled();
  });
});
