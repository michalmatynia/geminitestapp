import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  collectionMock,
  settingsFindOneMock,
  settingsFindMock,
  settingsToArrayMock,
  settingsUpdateOneMock,
  captureExceptionMock,
} = vi.hoisted(() => {
  const settingsFindOneMock = vi.fn();
  const settingsToArrayMock = vi.fn();
  const settingsUpdateOneMock = vi.fn();
  const settingsFindMock = vi.fn(() => ({
    toArray: settingsToArrayMock,
  }));
  const collectionMock = vi.fn(() => ({
    findOne: settingsFindOneMock,
    find: settingsFindMock,
    updateOne: settingsUpdateOneMock,
  }));
  const getMongoDbMock = vi.fn(async () => ({
    collection: collectionMock,
  }));
  const captureExceptionMock = vi.fn();

  return {
    getMongoDbMock,
    collectionMock,
    settingsFindOneMock,
    settingsFindMock,
    settingsToArrayMock,
    settingsUpdateOneMock,
    captureExceptionMock,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import {
  getProductStudioConfig,
  pruneProductStudioSourceSlotsForProject,
  setProductStudioConfig,
  setProductStudioProject,
  setProductStudioSourceSlot,
} from './product-studio-config';

const originalMongoUri = process.env['MONGODB_URI'];

const createStoredConfig = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    projectId: 'project-a',
    sourceSlotByImageIndex: {
      '0': 'slot-a',
      '2': 'slot-b',
    },
    sourceSlotHistoryByImageIndex: {
      '0': ['slot-a', 'slot-z'],
      '2': ['slot-b'],
    },
    updatedAt: '2026-03-27T00:00:00.000Z',
    ...overrides,
  });

const parseWrittenConfig = () => {
  const lastCall = settingsUpdateOneMock.mock.calls.at(-1);
  const update = lastCall?.[1] as
    | {
        $set?: {
          value?: string;
        };
      }
    | undefined;
  expect(update?.$set?.value).toEqual(expect.any(String));
  return JSON.parse(update?.$set?.value ?? '{}') as Record<string, unknown>;
};

describe('product-studio-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://unit-test';
    settingsFindOneMock.mockResolvedValue(null);
    settingsToArrayMock.mockResolvedValue([]);
    settingsUpdateOneMock.mockResolvedValue({ acknowledged: true });
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
      return;
    }
    process.env['MONGODB_URI'] = originalMongoUri;
  });

  it('returns a default config without hitting mongo when no provider is configured', async () => {
    delete process.env['MONGODB_URI'];

    const config = await getProductStudioConfig('prod-1');

    expect(config.projectId).toBeNull();
    expect(config.sourceSlotByImageIndex).toEqual({});
    expect(config.sourceSlotHistoryByImageIndex).toEqual({});
    expect(config.updatedAt).toEqual(expect.any(String));
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('normalizes stored product studio config payloads', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: JSON.stringify({
        projectId: '  project-a  ',
        sourceSlotByImageIndex: {
          '0': ' slot-a ',
          '1': '',
          '-1': 'bad',
          nope: 'skip',
        },
        sourceSlotHistoryByImageIndex: {
          '0': [' slot-a ', 'slot-a', '', 'slot-b'],
          '1': [''],
          nope: ['skip'],
        },
        updatedAt: '2026-03-27T00:00:00.000Z',
      }),
    });

    const config = await getProductStudioConfig(' prod-1 ');

    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(settingsFindOneMock).toHaveBeenCalledWith(
      {
        $or: [{ key: 'product_studio_config_prod-1' }, { _id: 'product_studio_config_prod-1' }],
      },
      { projection: { value: 1 } }
    );
    expect(config).toEqual({
      projectId: 'project-a',
      sourceSlotByImageIndex: { '0': 'slot-a' },
      sourceSlotHistoryByImageIndex: { '0': ['slot-a', 'slot-b'] },
      updatedAt: '2026-03-27T00:00:00.000Z',
    });
  });

  it('falls back to the default config when stored JSON is invalid', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: '{ definitely-not-json',
    });

    const config = await getProductStudioConfig('prod-1');

    expect(config.projectId).toBeNull();
    expect(config.sourceSlotByImageIndex).toEqual({});
    expect(config.sourceSlotHistoryByImageIndex).toEqual({});
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('resets source slot maps when the project changes', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: createStoredConfig(),
    });

    const next = await setProductStudioConfig('prod-1', {
      projectId: '  project-b  ',
    });

    const written = parseWrittenConfig();
    expect(next.projectId).toBe('project-b');
    expect(next.sourceSlotByImageIndex).toEqual({});
    expect(next.sourceSlotHistoryByImageIndex).toEqual({});
    expect(written).toMatchObject({
      projectId: 'project-b',
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
    });
    expect(settingsUpdateOneMock).toHaveBeenCalledWith(
      { key: 'product_studio_config_prod-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'product_studio_config_prod-1',
          value: expect.any(String),
          updatedAt: expect.any(Date),
        }),
        $setOnInsert: {
          createdAt: expect.any(Date),
        },
      }),
      { upsert: true }
    );
  });

  it('throws when writing config without a database provider', async () => {
    delete process.env['MONGODB_URI'];

    await expect(
      setProductStudioConfig('prod-1', {
        projectId: 'project-z',
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('updates source slot history with deduping and trimming', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: createStoredConfig({
        sourceSlotByImageIndex: { '2': 'slot-old' },
        sourceSlotHistoryByImageIndex: {
          '2': ['slot-old', 'slot-older'],
        },
      }),
    });

    const next = await setProductStudioSourceSlot('prod-1', 2.9, ' slot-new ');

    const written = parseWrittenConfig();
    expect(next.sourceSlotByImageIndex).toEqual({ '2': 'slot-new' });
    expect(next.sourceSlotHistoryByImageIndex).toEqual({
      '2': ['slot-new', 'slot-old', 'slot-older'],
    });
    expect(written).toMatchObject({
      sourceSlotByImageIndex: { '2': 'slot-new' },
      sourceSlotHistoryByImageIndex: {
        '2': ['slot-new', 'slot-old', 'slot-older'],
      },
    });
  });

  it('clears source slot state when the selected slot is removed', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: createStoredConfig({
        sourceSlotByImageIndex: { '0': 'slot-a' },
        sourceSlotHistoryByImageIndex: {
          '0': ['slot-a', 'slot-b'],
        },
      }),
    });

    const next = await setProductStudioSourceSlot('prod-1', 0, null);

    const written = parseWrittenConfig();
    expect(next.sourceSlotByImageIndex).toEqual({});
    expect(next.sourceSlotHistoryByImageIndex).toEqual({});
    expect(written).toMatchObject({
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
    });
  });

  it('delegates setProductStudioProject to the shared config write path', async () => {
    settingsFindOneMock.mockResolvedValue({
      value: createStoredConfig(),
    });

    const next = await setProductStudioProject('prod-1', ' project-c ');

    expect(next.projectId).toBe('project-c');
    expect(parseWrittenConfig()).toMatchObject({
      projectId: 'project-c',
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
    });
  });

  it('short-circuits prune requests without a valid project or deleted slot ids', async () => {
    await expect(
      pruneProductStudioSourceSlotsForProject({
        projectId: '   ',
        deletedSlotIds: ['slot-a'],
      })
    ).resolves.toEqual({
      projectId: '',
      deletedSlotIds: [],
      touchedProducts: 0,
      updatedProducts: [],
    });

    await expect(
      pruneProductStudioSourceSlotsForProject({
        projectId: 'project-a',
        deletedSlotIds: [' ', '\n'],
      })
    ).resolves.toEqual({
      projectId: 'project-a',
      deletedSlotIds: [],
      touchedProducts: 0,
      updatedProducts: [],
    });
    expect(settingsFindMock).not.toHaveBeenCalled();
  });

  it('prunes deleted source slots only for matching project configs', async () => {
    settingsToArrayMock.mockResolvedValue([
      {
        key: 'product_studio_config_prod-1',
        value: JSON.stringify({
          projectId: 'project-a',
          sourceSlotByImageIndex: {
            '0': 'slot-dead',
            '1': 'slot-keep',
          },
          sourceSlotHistoryByImageIndex: {
            '0': ['slot-dead', 'slot-older'],
            '1': ['slot-keep', 'slot-dead'],
          },
          updatedAt: '2026-03-27T00:00:00.000Z',
        }),
      },
      {
        key: 'product_studio_config_prod-2',
        value: JSON.stringify({
          projectId: 'project-b',
          sourceSlotByImageIndex: {
            '0': 'slot-dead',
          },
          sourceSlotHistoryByImageIndex: {
            '0': ['slot-dead'],
          },
          updatedAt: '2026-03-27T00:00:00.000Z',
        }),
      },
      {
        key: 'product_studio_config_prod-3',
        value: JSON.stringify({
          projectId: 'project-a',
          sourceSlotByImageIndex: {
            '0': 'slot-safe',
          },
          sourceSlotHistoryByImageIndex: {
            '0': ['slot-safe'],
          },
          updatedAt: '2026-03-27T00:00:00.000Z',
        }),
      },
    ]);

    const result = await pruneProductStudioSourceSlotsForProject({
      projectId: '  project-a ',
      deletedSlotIds: [' slot-dead ', '', 'slot-dead'],
    });

    expect(result).toEqual({
      projectId: 'project-a',
      deletedSlotIds: ['slot-dead'],
      touchedProducts: 1,
      updatedProducts: ['prod-1'],
    });
    expect(settingsFindMock).toHaveBeenCalledTimes(1);
    expect(settingsUpdateOneMock).toHaveBeenCalledTimes(1);
    expect(settingsUpdateOneMock).toHaveBeenCalledWith(
      { key: 'product_studio_config_prod-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'product_studio_config_prod-1',
          value: expect.any(String),
        }),
      }),
      { upsert: true }
    );
    expect(parseWrittenConfig()).toMatchObject({
      projectId: 'project-a',
      sourceSlotByImageIndex: { '1': 'slot-keep' },
      sourceSlotHistoryByImageIndex: { '0': ['slot-older'], '1': ['slot-keep'] },
    });
  });
});
