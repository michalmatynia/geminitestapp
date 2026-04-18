/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createIndex: vi.fn(),
  countDocuments: vi.fn(),
  deleteMany: vi.fn(),
  deleteOne: vi.fn(),
  distinct: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  bulkWrite: vi.fn(),
  insertOne: vi.fn(),
  sort: vi.fn(),
  sortedToArray: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  cloneCustomSelectorRegistryProfile,
  listCustomSelectorRegistry,
  saveCustomSelectorRegistryEntry,
  syncCustomSelectorRegistryFromCode,
} from './custom-selector-registry';

const makeDoc = (
  key: string,
  overrides: Partial<{
    profile: string;
    group: string;
    kind: 'selector' | 'selectors';
    valueType: 'string' | 'string_array';
    valueJson: string;
    itemCount: number;
    preview: string[];
    source: 'code' | 'mongo';
  }> = {}
) => {
  const now = new Date('2026-04-18T12:00:00.000Z');
  return {
    _id: new ObjectId(),
    profile: overrides.profile ?? 'custom',
    key,
    group: overrides.group ?? 'custom.content',
    kind: overrides.kind ?? 'selector',
    role: 'content_price' as const,
    description: 'Custom price selector',
    valueType: overrides.valueType ?? 'string',
    valueJson: overrides.valueJson ?? '".price"',
    itemCount: overrides.itemCount ?? 1,
    preview: overrides.preview ?? ['.price'],
    source: overrides.source ?? 'mongo',
    createdAt: now,
    updatedAt: now,
  };
};

describe('custom-selector-registry service', () => {
  beforeEach(() => {
    const sortedCursor = {
      toArray: mocks.sortedToArray,
    };
    const cursor = {
      sort: mocks.sort,
      toArray: mocks.sortedToArray,
    };

    mocks.bulkWrite.mockReset();
    mocks.countDocuments.mockReset();
    mocks.createIndex.mockReset();
    mocks.deleteMany.mockReset();
    mocks.deleteOne.mockReset();
    mocks.distinct.mockReset().mockResolvedValue([]);
    mocks.find.mockReset().mockReturnValue(cursor);
    mocks.findOne.mockReset().mockResolvedValue(null);
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'integration_custom_selector_registry') {
          return {};
        }

        return {
          bulkWrite: mocks.bulkWrite,
          countDocuments: mocks.countDocuments,
          createIndex: mocks.createIndex,
          deleteMany: mocks.deleteMany,
          deleteOne: mocks.deleteOne,
          distinct: mocks.distinct,
          find: mocks.find,
          findOne: mocks.findOne,
          insertOne: mocks.insertOne,
          updateOne: mocks.updateOne,
          updateMany: mocks.updateMany,
        };
      },
    });
    mocks.insertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
    mocks.sort.mockReset().mockReturnValue(sortedCursor);
    mocks.sortedToArray.mockReset().mockResolvedValue([]);
    mocks.updateOne.mockReset().mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 });
    mocks.updateMany.mockReset().mockResolvedValue({ modifiedCount: 1 });
  });

  it('lists seeded custom registry entries when Mongo is empty', async () => {
    const response = await listCustomSelectorRegistry();

    expect(response.profiles).toContain('custom');
    expect(response.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'custom',
          profile: 'custom',
          key: 'custom.content.price',
          role: 'content_price',
          source: 'code',
        }),
        expect.objectContaining({
          key: 'custom.form.submit',
          role: 'submit',
        }),
      ])
    );
  });

  it('syncs custom seeded registry entries into Mongo for a website-specific registry id', async () => {
    mocks.countDocuments.mockResolvedValue(17);

    const response = await syncCustomSelectorRegistryFromCode({
      profile: 'example_shop_com',
    });

    expect(mocks.insertOne).toHaveBeenCalled();
    expect(response.namespace).toBe('custom');
    expect(response.total).toBe(17);
    expect(response.message).toContain('example_shop_com');
  });

  it('saves a custom selector entry for a seeded key', async () => {
    const response = await saveCustomSelectorRegistryEntry({
      profile: 'example_shop_com',
      key: 'custom.content.price',
      valueJson: '".price"',
      role: 'content_price',
    });

    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: 'example_shop_com',
        key: 'custom.content.price',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          group: 'custom.content',
          kind: 'selector',
          role: 'content_price',
          valueJson: '".price"',
          source: 'mongo',
        }),
      }),
      { upsert: true }
    );
    expect(response.namespace).toBe('custom');
    expect(response.profile).toBe('example_shop_com');
  });

  it('clones the effective custom registry into a new profile', async () => {
    mocks.countDocuments.mockResolvedValueOnce(0);

    const response = await cloneCustomSelectorRegistryProfile({
      sourceProfile: 'custom',
      targetProfile: 'example_shop_clone',
    });

    expect(mocks.bulkWrite).toHaveBeenCalled();
    expect(response.namespace).toBe('custom');
    expect(response.targetProfile).toBe('example_shop_clone');
    expect(response.affectedEntries).toBeGreaterThan(0);
  });
});
