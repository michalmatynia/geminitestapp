import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProviderForKeyMock,
  getMongoDbMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  findProviderForKeyMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/settings-registry', () => ({
  findProviderForKey: findProviderForKeyMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import {
  clearSecretSettingCache,
  readSecretSettingValue,
  readSecretSettingValues,
} from './secret-settings';

describe('secret settings batching', () => {
  const originalMongoUri = process.env['MONGODB_URI'];

  beforeEach(() => {
    vi.clearAllMocks();
    clearSecretSettingCache();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    findProviderForKeyMock.mockResolvedValue(null);
  });

  afterEach(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('batches uncached mongo-backed secret reads into one query', async () => {
    const toArrayMock = vi.fn().mockResolvedValue([
      { _id: 'alpha', value: 'one' },
      { _id: 'beta', value: 'two' },
    ]);
    const findMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const collectionMock = vi.fn().mockReturnValue({ find: findMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    await expect(readSecretSettingValues(['alpha', 'beta'])).resolves.toEqual({
      alpha: 'one',
      beta: 'two',
    });

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledWith({
      $or: [{ _id: 'alpha' }, { key: 'alpha' }, { _id: 'beta' }, { key: 'beta' }],
    });
  });

  it('reuses the cached value for later single-key reads', async () => {
    const toArrayMock = vi.fn().mockResolvedValue([{ _id: 'alpha', value: 'one' }]);
    const findMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const collectionMock = vi.fn().mockReturnValue({ find: findMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    await expect(readSecretSettingValues(['alpha'])).resolves.toEqual({ alpha: 'one' });
    await expect(readSecretSettingValue('alpha')).resolves.toBe('one');

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledTimes(1);
  });
});
