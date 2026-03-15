/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMeMock, createScoreMock, logKangurClientErrorMock } = vi.hoisted(() => ({
  authMeMock: vi.fn(),
  createScoreMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
    },
    score: {
      create: createScoreMock,
    },
  }),
}));

import { persistKangurSessionScore } from './session-score';

describe('persistKangurSessionScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('records a session with the authenticated learner name when available', async () => {
    authMeMock.mockResolvedValue({
      full_name: 'Ada Lovelace',
      activeLearner: { displayName: 'Ada' },
    });
    createScoreMock.mockResolvedValue(undefined);

    await persistKangurSessionScore({
      operation: 'clock',
      score: 5,
      totalQuestions: 6,
      correctAnswers: 5,
      timeTakenSeconds: 42,
      xpEarned: 28,
    });

    expect(createScoreMock).toHaveBeenCalledWith({
      player_name: 'Ada Lovelace',
      score: 5,
      operation: 'clock',
      total_questions: 6,
      correct_answers: 5,
      time_taken: 42,
      xp_earned: 28,
    });
  });

  it('falls back to the stored guest learner name when auth is unavailable', async () => {
    authMeMock.mockRejectedValue(new Error('no auth'));
    createScoreMock.mockResolvedValue(undefined);
    window.sessionStorage.setItem('kangur.guest-player-name', 'Mila');

    await persistKangurSessionScore({
      operation: 'calendar',
      score: 6,
      totalQuestions: 6,
      correctAnswers: 6,
      timeTakenSeconds: 18,
      xpEarned: 32,
    });

    expect(createScoreMock).toHaveBeenCalledWith({
      player_name: 'Mila',
      score: 6,
      operation: 'calendar',
      total_questions: 6,
      correct_answers: 6,
      time_taken: 18,
      xp_earned: 32,
    });
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'persistKangurSessionScore',
        action: 'resolveSessionUser',
        operation: 'calendar',
      })
    );
  });

  it('skips score persistence for parent accounts without an active learner', async () => {
    authMeMock.mockResolvedValue({
      actorType: 'parent',
      full_name: 'Rodzic',
      activeLearner: null,
    });

    await persistKangurSessionScore({
      operation: 'adding',
      score: 4,
      totalQuestions: 6,
      correctAnswers: 4,
      timeTakenSeconds: 30,
      xpEarned: 18,
    });

    expect(createScoreMock).not.toHaveBeenCalled();
  });

  it('records a session for parent accounts with an active learner', async () => {
    authMeMock.mockResolvedValue({
      actorType: 'parent',
      full_name: 'Rodzic',
      activeLearner: { displayName: 'Maja', id: 'learner-1' },
    });
    createScoreMock.mockResolvedValue(undefined);

    await persistKangurSessionScore({
      operation: 'adding',
      score: 4,
      totalQuestions: 6,
      correctAnswers: 4,
      timeTakenSeconds: 30,
      xpEarned: 18,
    });

    expect(createScoreMock).toHaveBeenCalledWith({
      player_name: 'Rodzic',
      score: 4,
      operation: 'adding',
      total_questions: 6,
      correct_answers: 4,
      time_taken: 30,
      xp_earned: 18,
    });
  });
});
