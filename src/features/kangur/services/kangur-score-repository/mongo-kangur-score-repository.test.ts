import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createIndexMock,
  findOneMock,
  insertOneMock,
  findMock,
  toArrayMock,
  getMongoDbMock,
} = vi.hoisted(() => {
  const createIndexMock = vi.fn();
  const findOneMock = vi.fn();
  const insertOneMock = vi.fn();
  const toArrayMock = vi.fn();
  const sortMock = vi.fn(() => ({ limit: limitMock }));
  const limitMock = vi.fn(() => ({ toArray: toArrayMock }));
  const findMock = vi.fn(() => ({ sort: sortMock }));
  const collectionMock = vi.fn(() => ({
    createIndex: createIndexMock,
    findOne: findOneMock,
    insertOne: insertOneMock,
    find: findMock,
  }));
  const getMongoDbMock = vi.fn(async () => ({
    collection: collectionMock,
  }));

  return {
    createIndexMock,
    findOneMock,
    insertOneMock,
    findMock,
    toArrayMock,
    getMongoDbMock,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { mongoKangurScoreRepository } from './mongo-kangur-score-repository';

describe('mongoKangurScoreRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createIndexMock.mockResolvedValue('kangur_scores_client_mutation_id_unique');
    toArrayMock.mockResolvedValue([]);
  });

  it('returns the existing score when insert races on a duplicate client mutation id', async () => {
    const insertedId = new ObjectId('65eb0742d2a7cc0d8f4c1a11');
    insertOneMock.mockRejectedValue({ code: 11000 });
    findOneMock.mockResolvedValue({
      _id: insertedId,
      player_name: 'Ada',
      score: 8,
      operation: 'division',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 30,
      created_date: new Date('2026-03-08T13:10:00.000Z'),
      client_mutation_id: 'guest-score:mongo-race',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    });

    const result = await mongoKangurScoreRepository.createScore({
      player_name: 'Ada',
      score: 8,
      operation: 'division',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 30,
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
      client_mutation_id: 'guest-score:mongo-race',
    });

    expect(createIndexMock).toHaveBeenCalledWith(
      { client_mutation_id: 1 },
      expect.objectContaining({
        name: 'kangur_scores_client_mutation_id_unique',
        unique: true,
        sparse: true,
      })
    );
    expect(findOneMock).toHaveBeenCalledWith({
      client_mutation_id: 'guest-score:mongo-race',
    });
    expect(result).toEqual({
      id: insertedId.toString(),
      player_name: 'Ada',
      score: 8,
      operation: 'division',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 30,
      xp_earned: null,
      created_date: '2026-03-08T13:10:00.000Z',
      client_mutation_id: 'guest-score:mongo-race',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    });
  });

  it('applies subject-aware filters for maths scores', async () => {
    toArrayMock.mockResolvedValue([]);

    await mongoKangurScoreRepository.listScores({
      sort: '-score',
      limit: 10,
      filters: { subject: 'maths' },
    });

    expect(findMock).toHaveBeenCalledWith({
      $and: [
        {
          $or: [
            { subject: 'maths' },
            { subject: { $exists: false } },
            { subject: null },
          ],
        },
        {
          $nor: [
            { operation: /^english_/i },
            { operation: /^alphabet_/i },
            { operation: /^art_/i },
            { operation: /^music_/i },
          ],
        },
      ],
    });
  });

  it('applies subject-aware filters for english scores', async () => {
    toArrayMock.mockResolvedValue([]);

    await mongoKangurScoreRepository.listScores({
      sort: '-score',
      limit: 10,
      filters: { subject: 'english' },
    });

    expect(findMock).toHaveBeenCalledWith({
      $or: [{ subject: 'english' }, { operation: { $regex: /^english_/i } }],
    });
  });
});
