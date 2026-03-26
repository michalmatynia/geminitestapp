import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_LEGACY_SETTINGS_COLLECTION } from '@/features/kangur/services/kangur-legacy-settings-store';

vi.mock('server-only', () => ({}));

const {
  getMongoDbMock,
  captureExceptionMock,
  logWarningMock,
  createIndexMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
  createIndexMock: vi.fn(),
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

type MongoCollectionStub = {
  createIndex?: ReturnType<typeof vi.fn>;
  findOne?: ReturnType<typeof vi.fn>;
  find?: ReturnType<typeof vi.fn>;
  updateOne?: ReturnType<typeof vi.fn>;
};

const createMongoStub = (collections: Record<string, MongoCollectionStub>) => ({
  collection: vi.fn((name: string) => {
    const collection = collections[name];
    if (!collection) {
      throw new Error(`Unexpected collection access: ${name}`);
    }
    return {
      createIndex: collection.createIndex ?? createIndexMock,
      findOne: collection.findOne ?? vi.fn(),
      find: collection.find ?? vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      updateOne: collection.updateOne ?? vi.fn().mockResolvedValue({ acknowledged: true }),
    };
  }),
});

describe('kangur-settings-repository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    createIndexMock.mockResolvedValue('kangur_settings_key');
    logWarningMock.mockResolvedValue(undefined);

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
      };
    });
  });

  it('returns a stored Kangur setting without querying the legacy collection', async () => {
    const kangurFindOneMock = vi.fn().mockResolvedValue({
      _id: 'kangur_launch_route',
      key: 'kangur_launch_route',
      value: '{"route":"dedicated_app"}',
    });
    const legacyFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([]),
    }));

    getMongoDbMock.mockResolvedValue(
      createMongoStub({
        kangur_settings: {
          createIndex: createIndexMock,
          findOne: kangurFindOneMock,
        },
        [KANGUR_LEGACY_SETTINGS_COLLECTION]: {
          find: legacyFindMock,
        },
      })
    );

    const { readKangurSettingValue } = await import('./kangur-settings-repository');

    await expect(readKangurSettingValue('kangur_launch_route')).resolves.toBe(
      '{"route":"dedicated_app"}'
    );
    expect(kangurFindOneMock).toHaveBeenCalledTimes(1);
    expect(legacyFindMock).not.toHaveBeenCalled();
  });

  it('falls back to the legacy collection on a miss and backfills the Kangur collection', async () => {
    const kangurFindOneMock = vi.fn().mockResolvedValue(null);
    const legacyFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'kangur_theme_daily',
          value: '{"accent":"sun"}',
        },
      ]),
    }));
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue(
      createMongoStub({
        kangur_settings: {
          createIndex: createIndexMock,
          findOne: kangurFindOneMock,
          updateOne: updateOneMock,
        },
        [KANGUR_LEGACY_SETTINGS_COLLECTION]: {
          find: legacyFindMock,
        },
      })
    );

    const { readKangurSettingValue } = await import('./kangur-settings-repository');

    await expect(readKangurSettingValue('kangur_theme_daily')).resolves.toBe('{"accent":"sun"}');
    await vi.waitFor(() => expect(updateOneMock).toHaveBeenCalledTimes(1));
    expect(kangurFindOneMock).toHaveBeenCalledTimes(1);
    expect(legacyFindMock).toHaveBeenCalledTimes(1);
    expect(updateOneMock).toHaveBeenCalledWith(
      { $or: [{ _id: 'kangur_theme_daily' }, { key: 'kangur_theme_daily' }] },
      expect.objectContaining({
        $set: expect.objectContaining({ key: 'kangur_theme_daily', value: '{"accent":"sun"}' }),
      }),
      { upsert: true }
    );
  });

  it('queries the legacy collection only for keys missing from the Kangur collection', async () => {
    const kangurFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'kangur_theme_daily',
          value: '{"accent":"sun"}',
        },
      ]),
    }));
    const legacyFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'kangur_theme_dawn',
          value: '{"accent":"dawn"}',
        },
      ]),
    }));
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue(
      createMongoStub({
        kangur_settings: {
          createIndex: createIndexMock,
          find: kangurFindMock,
          updateOne: updateOneMock,
        },
        [KANGUR_LEGACY_SETTINGS_COLLECTION]: {
          find: legacyFindMock,
        },
      })
    );

    const { listKangurSettingsByKeys } = await import('./kangur-settings-repository');

    await expect(
      listKangurSettingsByKeys([
        'kangur_theme_daily',
        'kangur_theme_dawn',
        'kangur_theme_sunset',
      ])
    ).resolves.toEqual([
      { key: 'kangur_theme_daily', value: '{"accent":"sun"}' },
      { key: 'kangur_theme_dawn', value: '{"accent":"dawn"}' },
    ]);

    expect(kangurFindMock).toHaveBeenCalledWith(
      {
        $or: [
          {
            key: {
              $in: ['kangur_theme_daily', 'kangur_theme_dawn', 'kangur_theme_sunset'],
            },
          },
          {
            _id: {
              $in: ['kangur_theme_daily', 'kangur_theme_dawn', 'kangur_theme_sunset'],
            },
          },
        ],
      },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
    expect(legacyFindMock).toHaveBeenCalledWith(
      {
        $or: [
          {
            key: {
              $in: ['kangur_theme_dawn', 'kangur_theme_sunset'],
            },
          },
          {
            _id: {
              $in: ['kangur_theme_dawn', 'kangur_theme_sunset'],
            },
          },
        ],
      },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
    await vi.waitFor(() => expect(updateOneMock).toHaveBeenCalledTimes(1));
    expect(updateOneMock).toHaveBeenCalledWith(
      { $or: [{ _id: 'kangur_theme_dawn' }, { key: 'kangur_theme_dawn' }] },
      expect.objectContaining({
        $set: expect.objectContaining({ key: 'kangur_theme_dawn', value: '{"accent":"dawn"}' }),
      }),
      { upsert: true }
    );
  });

  it('skips the legacy collection for multi-key reads when Kangur already has every requested key', async () => {
    const kangurFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        { _id: 'kangur_theme_daily', value: '{"accent":"sun"}' },
        { _id: 'kangur_theme_dawn', value: '{"accent":"dawn"}' },
      ]),
    }));
    const legacyFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([]),
    }));

    getMongoDbMock.mockResolvedValue(
      createMongoStub({
        kangur_settings: {
          createIndex: createIndexMock,
          find: kangurFindMock,
        },
        [KANGUR_LEGACY_SETTINGS_COLLECTION]: {
          find: legacyFindMock,
        },
      })
    );

    const { listKangurSettingsByKeys } = await import('./kangur-settings-repository');

    await expect(
      listKangurSettingsByKeys(['kangur_theme_daily', 'kangur_theme_dawn'])
    ).resolves.toEqual([
      { key: 'kangur_theme_daily', value: '{"accent":"sun"}' },
      { key: 'kangur_theme_dawn', value: '{"accent":"dawn"}' },
    ]);
    expect(kangurFindMock).toHaveBeenCalledTimes(1);
    expect(legacyFindMock).not.toHaveBeenCalled();
  });
});
