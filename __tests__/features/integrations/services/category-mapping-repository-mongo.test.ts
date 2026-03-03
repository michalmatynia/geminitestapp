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
    const bulkWrite = vi.fn().mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 1,
      upsertedCount: 0,
    });

    const mappingCollection = {
      createIndex,
      bulkWrite,
    };

    vi.mocked(getMongoDb).mockResolvedValue({
      collection: (name: string) => {
        if (name === 'category_mappings') return mappingCollection;
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
    expect(bulkWrite).toHaveBeenCalledTimes(1);

    const firstOperation = (bulkWrite.mock.calls[0]?.[0] as Array<{
      updateOne: {
        update: {
          $set: Record<string, unknown>;
          $setOnInsert: Record<string, unknown>;
        };
      };
    }>)?.[0];
    const updatePayload = firstOperation?.updateOne.update as {
      $set: Record<string, unknown>;
      $setOnInsert: Record<string, unknown>;
    };

    expect(updatePayload.$set['externalCategoryId']).toBeUndefined();
    expect(updatePayload.$setOnInsert['externalCategoryId']).toBeUndefined();
    expect(updatePayload.$set['internalCategoryId']).toBe('internal-1');
  });
});
