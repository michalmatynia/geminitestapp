/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES } from '@/shared/lib/browser-execution/selectors/tradera';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  countDocuments: vi.fn(),
  find: vi.fn(),
  toArray: vi.fn(),
  sort: vi.fn(),
  sortedToArray: vi.fn(),
  bulkWrite: vi.fn(),
  deleteMany: vi.fn(),
  deleteOne: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  cloneTraderaSelectorRegistryProfile,
  deleteTraderaSelectorRegistryEntry,
  deleteTraderaSelectorRegistryProfile,
  listTraderaSelectorRegistry,
  resolveTraderaSelectorRegistryRuntime,
  renameTraderaSelectorRegistryProfile,
  saveTraderaSelectorRegistryEntry,
  syncTraderaSelectorRegistryFromCode,
} from './tradera-selector-registry';

const makeDoc = (
  key: string,
  overrides: Partial<{
    profile: string;
    group: string;
    kind: (typeof TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES)[number]['kind'];
    role: (typeof TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES)[number]['role'];
    description: string | null;
    valueType: (typeof TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES)[number]['valueType'];
    valueJson: string;
    itemCount: number;
    preview: string[];
    source: 'code' | 'mongo';
  }> = {}
) => {
  const seed =
    TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.find((entry) => entry.key === key) ??
    TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];
  const now = new Date('2026-04-16T12:00:00.000Z');

  return {
    _id: new ObjectId(),
    profile: overrides.profile ?? 'default',
    key,
    group: overrides.group ?? seed.group,
    kind: overrides.kind ?? seed.kind,
    role: overrides.role ?? seed.role,
    description: overrides.description ?? seed.description,
    valueType: overrides.valueType ?? seed.valueType,
    valueJson: overrides.valueJson ?? seed.valueJson,
    itemCount: overrides.itemCount ?? seed.itemCount,
    preview: overrides.preview ?? seed.preview,
    source: overrides.source ?? seed.source,
    createdAt: now,
    updatedAt: now,
  };
};

describe('tradera-selector-registry service', () => {
  beforeEach(() => {
    const sortedCursor = {
      toArray: mocks.sortedToArray,
    };

    const cursor = {
      toArray: mocks.toArray,
      sort: mocks.sort,
    };

    mocks.bulkWrite.mockReset();
    mocks.countDocuments.mockReset();
    mocks.deleteMany.mockReset();
    mocks.deleteOne.mockReset();
    mocks.find.mockReset().mockReturnValue(cursor);
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'integration_tradera_selector_registry') {
          return {};
        }

        return {
          bulkWrite: mocks.bulkWrite,
          countDocuments: mocks.countDocuments,
          deleteMany: mocks.deleteMany,
          deleteOne: mocks.deleteOne,
          find: mocks.find,
          updateOne: mocks.updateOne,
          updateMany: mocks.updateMany,
        };
      },
    });
    mocks.sort.mockReset().mockReturnValue(sortedCursor);
    mocks.sortedToArray.mockReset();
    mocks.toArray.mockReset();
    mocks.updateOne.mockReset();
    mocks.updateMany.mockReset();
  });

  it('hydrates Mongo from code when the selector registry collection is empty', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    mocks.countDocuments.mockResolvedValueOnce(0);
    mocks.toArray.mockResolvedValueOnce([]);
    mocks.bulkWrite.mockResolvedValueOnce({});
    mocks.deleteMany.mockResolvedValueOnce({ deletedCount: 0 });
    mocks.sortedToArray.mockResolvedValueOnce([makeDoc(firstSeed.key)]);

    const response = await listTraderaSelectorRegistry();

    expect(mocks.bulkWrite).toHaveBeenCalledTimes(1);
    expect(response.total).toBe(1);
    expect(response.entries[0]).toEqual(
      expect.objectContaining({
        profile: 'default',
        key: firstSeed.key,
        group: firstSeed.group,
        kind: firstSeed.kind,
      })
    );
  });

  it('syncs code seeds into Mongo and removes stale entries', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];
    const secondSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[1];

    mocks.toArray.mockResolvedValueOnce([
      makeDoc(firstSeed.key),
      makeDoc(secondSeed.key, {
        valueJson: '["changed-value"]',
      }),
      makeDoc('STALE_ENTRY', {
        group: 'stale',
        kind: 'selectors',
        valueType: 'string_array',
        valueJson: '[]',
        itemCount: 0,
        preview: [],
        source: 'mongo',
      }),
    ]);
    mocks.bulkWrite.mockResolvedValueOnce({});
    mocks.deleteMany.mockResolvedValueOnce({ deletedCount: 1 });

    const response = await syncTraderaSelectorRegistryFromCode();

    expect(response.insertedCount).toBe(TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length - 2);
    expect(response.updatedCount).toBe(1);
    expect(response.deletedCount).toBe(1);
    expect(response.total).toBe(TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length);
    expect(mocks.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: expect.objectContaining({ key: firstSeed.key }),
            upsert: true,
          }),
        }),
      ]),
      { ordered: false }
    );
    expect(mocks.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        key: { $nin: TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => entry.key) },
      })
    );
  });

  it('builds a profile-aware runtime with requested-profile overrides', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];
    const secondSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[1];

    mocks.countDocuments.mockResolvedValueOnce(1);
    mocks.toArray
      .mockResolvedValueOnce([
        makeDoc(firstSeed.key),
        makeDoc(secondSeed.key),
      ])
      .mockResolvedValueOnce([
        makeDoc(firstSeed.key, {
          profile: 'experimental',
          valueJson: '["button:has-text(\\"Override\\")"]',
          preview: ['button:has-text("Override")'],
          source: 'mongo',
        }),
      ]);

    const resolution = await resolveTraderaSelectorRegistryRuntime({
      profile: 'experimental',
    });

    expect(resolution.requestedProfile).toBe('experimental');
    expect(resolution.resolvedProfile).toBe('experimental');
    expect(resolution.sourceProfiles).toEqual(['default', 'experimental']);
    expect(resolution.fallbackToCode).toBe(false);
    expect(resolution.runtime).toContain('const LOGIN_SUCCESS_SELECTORS = [\'button:has-text("Override")\'];');
    expect(resolution.runtime).toContain('const TRADERA_SELECTOR_REGISTRY_META = {');
    expect(resolution.runtime).toContain('"LOGIN_SUCCESS_SELECTORS"');
    expect(resolution.runtime).toContain('"role": "ready_signal"');
    expect(resolution.runtime).toContain('const TRADERA_SELECTOR_REGISTRY_VALUE_KEYS = new Map([');
  });

  it('falls back to the default runtime when Mongo resolution fails', async () => {
    mocks.getMongoDb.mockRejectedValueOnce(new Error('mongo offline'));

    const resolution = await resolveTraderaSelectorRegistryRuntime({
      profile: 'experimental',
    });

    expect(resolution.requestedProfile).toBe('experimental');
    expect(resolution.resolvedProfile).toBe('default');
    expect(resolution.sourceProfiles).toEqual(['code']);
    expect(resolution.fallbackToCode).toBe(true);
    expect(resolution.runtime).toContain('const LOGIN_SUCCESS_SELECTORS = [');
  });

  it('saves a selector override for a non-default profile', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    mocks.updateOne.mockResolvedValueOnce({ acknowledged: true });

    const response = await saveTraderaSelectorRegistryEntry({
      profile: 'experimental',
      key: firstSeed.key,
      valueJson: '["button:has-text(\\"Edited\\")"]',
      role: 'ready_signal',
    });

    expect(response).toEqual(
      expect.objectContaining({
        profile: 'experimental',
        key: firstSeed.key,
        itemCount: 1,
        preview: ['button:has-text("Edited")'],
      })
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      {
        key: firstSeed.key,
        profile: 'experimental',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          role: 'ready_signal',
          source: 'mongo',
          valueJson: '[\n  "button:has-text(\\"Edited\\")"\n]',
        }),
      }),
      { upsert: true }
    );
  });

  it('rejects selector saves when the JSON value does not match the seed value type', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    await expect(
      saveTraderaSelectorRegistryEntry({
        profile: 'experimental',
        key: firstSeed.key,
        valueJson: '"not-an-array"',
      })
    ).rejects.toThrow(`Selector "${firstSeed.key}" must match the "${firstSeed.valueType}" registry value type.`);
  });

  it('deletes a selector override from a non-default profile', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    mocks.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    const response = await deleteTraderaSelectorRegistryEntry({
      profile: 'experimental',
      key: firstSeed.key,
    });

    expect(response).toEqual(
      expect.objectContaining({
        profile: 'experimental',
        key: firstSeed.key,
        deleted: true,
      })
    );
    expect(mocks.deleteOne).toHaveBeenCalledWith({
      profile: 'experimental',
      key: firstSeed.key,
    });
  });

  it('rejects deleting default selector entries', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    await expect(
      deleteTraderaSelectorRegistryEntry({
        profile: 'default',
        key: firstSeed.key,
      })
    ).rejects.toThrow(
      'Default selector entries cannot be deleted. Sync the default profile from code to reset it.'
    );
  });

  it('clones the effective source profile into a new target profile', async () => {
    const firstSeed = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES[0];

    mocks.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    mocks.toArray
      .mockResolvedValueOnce([makeDoc(firstSeed.key)])
      .mockResolvedValueOnce([
        makeDoc(firstSeed.key, {
          profile: 'experimental',
          valueJson: '["button:has-text(\\"Override\\")"]',
          preview: ['button:has-text("Override")'],
          source: 'mongo',
        }),
      ]);
    mocks.bulkWrite.mockResolvedValueOnce({});

    const response = await cloneTraderaSelectorRegistryProfile({
      sourceProfile: 'experimental',
      targetProfile: 'staging',
    });

    expect(response).toEqual(
      expect.objectContaining({
        action: 'clone_profile',
        profile: 'experimental',
        targetProfile: 'staging',
        affectedEntries: TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length,
      })
    );
    expect(mocks.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: {
              key: firstSeed.key,
              profile: 'staging',
            },
            update: expect.objectContaining({
              $set: expect.objectContaining({
                profile: 'staging',
                source: 'mongo',
                valueJson: '["button:has-text(\\"Override\\")"]',
              }),
            }),
          }),
        }),
      ]),
      { ordered: false }
    );
  });

  it('renames a non-default selector profile', async () => {
    mocks.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mocks.updateMany.mockResolvedValueOnce({ modifiedCount: 3 });

    const response = await renameTraderaSelectorRegistryProfile({
      profile: 'experimental',
      targetProfile: 'staging',
    });

    expect(response).toEqual(
      expect.objectContaining({
        action: 'rename_profile',
        profile: 'experimental',
        targetProfile: 'staging',
        affectedEntries: 3,
      })
    );
    expect(mocks.updateMany).toHaveBeenCalledWith(
      { profile: 'experimental' },
      expect.objectContaining({
        $set: expect.objectContaining({
          profile: 'staging',
        }),
      })
    );
  });

  it('deletes a non-default selector profile', async () => {
    mocks.deleteMany.mockResolvedValueOnce({ deletedCount: 4 });

    const response = await deleteTraderaSelectorRegistryProfile({
      profile: 'experimental',
    });

    expect(response).toEqual(
      expect.objectContaining({
        action: 'delete_profile',
        profile: 'experimental',
        affectedEntries: 4,
      })
    );
    expect(mocks.deleteMany).toHaveBeenCalledWith({ profile: 'experimental' });
  });
});
