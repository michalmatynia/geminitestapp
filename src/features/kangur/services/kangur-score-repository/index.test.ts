import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mongoCreateScoreMock,
  mongoListScoresMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  mongoCreateScoreMock: vi.fn(),
  mongoListScoresMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('./mongo-kangur-score-repository', () => ({
  mongoKangurScoreRepository: {
    createScore: mongoCreateScoreMock,
    listScores: mongoListScoresMock,
  },
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { getKangurScoreRepository } from './index';

describe('kangur score repository observability wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to MongoDB repository when app provider is mongodb', async () => {
    const createdScore = {
      id: 'mongo-1',
      player_name: 'Ada',
      score: 10,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 10,
      time_taken: 22,
      created_date: '2026-03-05T18:00:00.000Z',
      created_by: null,
    };
    mongoCreateScoreMock.mockResolvedValue(createdScore);
    mongoListScoresMock.mockResolvedValue([createdScore]);

    const repository = await getKangurScoreRepository();
    const createResult = await repository.createScore({
      player_name: 'Ada',
      score: 10,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 10,
      time_taken: 22,
      created_by: null,
    });
    const listResult = await repository.listScores({ sort: '-score', limit: 5 });

    expect(mongoCreateScoreMock).toHaveBeenCalledTimes(1);
    expect(mongoListScoresMock).toHaveBeenCalledWith({ sort: '-score', limit: 5 });
    expect(createResult).toEqual(createdScore);
    expect(listResult).toEqual([createdScore]);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures createScore failures with Mongo repository context before rethrowing', async () => {
    const failure = new Error('create failed');
    mongoCreateScoreMock.mockRejectedValue(failure);

    const repository = await getKangurScoreRepository();

    await expect(
      repository.createScore({
        player_name: 'Ada',
        score: 7,
        operation: 'subtraction',
        subject: 'maths',
        total_questions: 10,
        correct_answers: 7,
        time_taken: 30,
        created_by: null,
      })
    ).rejects.toThrow('create failed');

    expect(captureExceptionMock).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        service: 'kangur.score-repository',
        action: 'createScore',
        provider: 'mongodb',
        operation: 'subtraction',
        score: 7,
        totalQuestions: 10,
        correctAnswers: 7,
      })
    );
  });

  it('captures listScores failures with Mongo query context before rethrowing', async () => {
    const failure = new Error('list failed');
    mongoListScoresMock.mockRejectedValue(failure);

    const repository = await getKangurScoreRepository();

    await expect(
      repository.listScores({
        sort: '-created_date',
        limit: 25,
        filters: { operation: 'addition', created_by: 'teacher@example.com' },
      })
    ).rejects.toThrow('list failed');

    expect(captureExceptionMock).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        service: 'kangur.score-repository',
        action: 'listScores',
        provider: 'mongodb',
        sort: '-created_date',
        limit: 25,
        hasFilters: true,
      })
    );
  });
});
