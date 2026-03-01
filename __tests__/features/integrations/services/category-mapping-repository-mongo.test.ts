/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {},
}));

describe('category-mapping-repository (mongodb)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
  });

  it('bulkUpsert does not duplicate externalCategoryId across $set and $setOnInsert', async () => {
    const createIndex = vi.fn().mockResolvedValue('ok');
    const externalFindToArray = vi
      .fn()
      .mockResolvedValue([{ _id: 'canonical-external-id', externalId: 'base-external-100' }]);
    const externalFind = vi.fn().mockReturnValue({
      toArray: externalFindToArray,
    });
    const updateOne = vi.fn().mockResolvedValue({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    });
    const updateMany = vi.fn().mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedId: null,
    });

    const mappingCollection = {
      createIndex,
      updateOne,
      updateMany,
    };
    const externalCollection = {
      find: externalFind,
    };

    vi.mocked(getMongoDb).mockResolvedValue({
      collection: (name: string) => {
        if (name === 'category_mappings') return mappingCollection;
        if (name === 'external_categories') return externalCollection;
        throw new Error(`Unexpected collection: ${name}`);
      },
    } as never);

    const repository = getCategoryMappingRepository();
    const count = await repository.bulkUpsert('conn-1', 'catalog-1', [
      {
        externalCategoryId: 'base-external-100',
        internalCategoryId: 'internal-1',
      },
    ]);

    expect(count).toBe(1);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(1);

    const updatePayload = updateOne.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>;
      $setOnInsert: Record<string, unknown>;
    };

    expect(updatePayload.$set['externalCategoryId']).toBeUndefined();
    expect(updatePayload.$setOnInsert['externalCategoryId']).toBeUndefined();
    expect(updatePayload.$set['internalCategoryId']).toBe('internal-1');
  });
});
