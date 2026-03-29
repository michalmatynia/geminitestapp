/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKangurGameBuiltInInstancesForGame, getKangurGameDefinition } from '@/features/kangur/games';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('mongoKangurGameInstanceRepository bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds built-in game instances into Mongo when a game has none yet', async () => {
    const expected = getKangurGameBuiltInInstancesForGame(getKangurGameDefinition('clock_training'));
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

    const { mongoKangurGameInstanceRepository } = await import(
      './mongo-kangur-game-instance-repository'
    );

    const result = await mongoKangurGameInstanceRepository.listInstances({
      gameId: 'clock_training',
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });
});
