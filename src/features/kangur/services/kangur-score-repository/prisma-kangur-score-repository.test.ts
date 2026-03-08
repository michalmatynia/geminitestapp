import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  settingFindUniqueMock,
  settingCreateMock,
  transactionMock,
  PrismaClientKnownRequestErrorMock,
} = vi.hoisted(() => {
  class PrismaClientKnownRequestErrorMock extends Error {
    code: string;

    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    settingFindUniqueMock: vi.fn(),
    settingCreateMock: vi.fn(),
    transactionMock: vi.fn(),
    PrismaClientKnownRequestErrorMock,
  };
});

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      findUnique: settingFindUniqueMock,
      create: settingCreateMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock('@/shared/lib/db/prisma-client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: PrismaClientKnownRequestErrorMock,
  },
}));

import { prismaKangurScoreRepository } from './prisma-kangur-score-repository';

describe('prismaKangurScoreRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the existing score when the client mutation id already exists', async () => {
    const existingScore = {
      id: 'score-existing',
      player_name: 'Ada',
      score: 10,
      operation: 'addition',
      total_questions: 10,
      correct_answers: 10,
      time_taken: 20,
      created_date: '2026-03-08T13:00:00.000Z',
      client_mutation_id: 'guest-score:123',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    };

    settingFindUniqueMock
      .mockResolvedValueOnce({ value: 'kangur_score:1741438800000:score-existing' })
      .mockResolvedValueOnce({
        key: 'kangur_score:1741438800000:score-existing',
        value: JSON.stringify(existingScore),
      });

    const result = await prismaKangurScoreRepository.createScore({
      player_name: 'Ada',
      score: 10,
      operation: 'addition',
      total_questions: 10,
      correct_answers: 10,
      time_taken: 20,
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
      client_mutation_id: 'guest-score:123',
    });

    expect(result).toEqual(existingScore);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('replays the existing score after a prisma unique constraint race', async () => {
    const existingScore = {
      id: 'score-raced',
      player_name: 'Ada',
      score: 9,
      operation: 'mixed',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 25,
      created_date: '2026-03-08T13:05:00.000Z',
      client_mutation_id: 'guest-score:race',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    };

    settingFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: 'kangur_score:1741439100000:score-raced' })
      .mockResolvedValueOnce({
        key: 'kangur_score:1741439100000:score-raced',
        value: JSON.stringify(existingScore),
      });
    transactionMock.mockRejectedValue(
      new PrismaClientKnownRequestErrorMock('Unique constraint failed', 'P2002')
    );

    const result = await prismaKangurScoreRepository.createScore({
      player_name: 'Ada',
      score: 9,
      operation: 'mixed',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 25,
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
      client_mutation_id: 'guest-score:race',
    });

    expect(result).toEqual(existingScore);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});
