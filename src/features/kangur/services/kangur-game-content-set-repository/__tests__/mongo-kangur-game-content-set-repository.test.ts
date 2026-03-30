/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKangurGameContentSetsForGame, getKangurGameDefinition } from '@/features/kangur/games';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('mongoKangurGameContentSetRepository bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('seeds built-in launchable game content sets before reading a game', async () => {
    const expected = getKangurGameContentSetsForGame(getKangurGameDefinition('clock_training'));
    const toArrayMock = vi.fn().mockResolvedValue(expected);
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

    const { mongoKangurGameContentSetRepository } = await import(
      '../mongo-kangur-game-content-set-repository'
    );

    const result = await mongoKangurGameContentSetRepository.listContentSets({
      gameId: 'clock_training',
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it('can derive the game id from a content-set id and still backfill built-ins', async () => {
    const expected = getKangurGameContentSetsForGame(getKangurGameDefinition('clock_training'));
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      createIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(expected),
        }),
      }),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });

    const { mongoKangurGameContentSetRepository } = await import(
      '../mongo-kangur-game-content-set-repository'
    );

    await mongoKangurGameContentSetRepository.listContentSets({
      contentSetId: 'clock_training:default',
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
  });
});
