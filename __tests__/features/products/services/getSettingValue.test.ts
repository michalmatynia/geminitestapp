import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mongoFindOne: vi.fn(),
  logWarning: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: mocks.mongoFindOne,
    }),
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn().mockResolvedValue(undefined),
    logWarning: mocks.logWarning,
  },
}));

import { getSettingValue } from '@/shared/lib/ai/server-settings';

describe('getSettingValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://test-db';
  });

  it('reads settings from Mongo by key or _id', async () => {
    mocks.mongoFindOne.mockResolvedValue({ value: 'mongo-value' });

    const value = await getSettingValue('site_name');

    expect(value).toBe('mongo-value');
    expect(mocks.mongoFindOne).toHaveBeenCalledWith({
      $or: [{ _id: 'site_name' }, { key: 'site_name' }],
    });
  });

  it('returns null when Mongo has no stored value', async () => {
    mocks.mongoFindOne.mockResolvedValue(null);

    await expect(getSettingValue('missing_key')).resolves.toBeNull();
    expect(mocks.mongoFindOne).toHaveBeenCalledOnce();
  });

  it('returns null without querying Mongo when MONGODB_URI is missing', async () => {
    delete process.env['MONGODB_URI'];

    await expect(getSettingValue('site_name')).resolves.toBeNull();
    expect(mocks.mongoFindOne).not.toHaveBeenCalled();
  });

  it('logs a warning and returns null when Mongo lookup fails', async () => {
    const error = new Error('mongo unavailable');
    mocks.mongoFindOne.mockRejectedValue(error);

    await expect(getSettingValue('site_name')).resolves.toBeNull();
    expect(mocks.logWarning).toHaveBeenCalledWith('Mongo setting fetch failed for site_name', {
      service: 'ai-server-settings',
      key: 'site_name',
      error,
    });
  });
});
