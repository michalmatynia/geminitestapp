/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('listKangurGames bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds default Kangur games into Mongo when the collection is empty', async () => {
    const expected = createDefaultKangurGames();
    const toArrayMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(expected);
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      createIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: toArrayMock,
        }),
      }),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });

    const { listKangurGames } = await import('./mongo-kangur-game-repository');

    const result = await listKangurGames();

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });
});
