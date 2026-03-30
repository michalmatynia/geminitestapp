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
  reportKangurClientError: (
    error: unknown,
    report: { context?: Record<string, unknown> }
  ) => {
    logKangurClientErrorMock(error, { ...report, ...(report.context ?? {}) });
  },
  withKangurClientError: async (
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return await task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
  withKangurClientErrorSync: (
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => unknown,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
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

import { loadGuestKangurScores } from '@/features/kangur/services/guest-kangur-scores';
import { persistKangurSessionScore } from '../session-score';

describe('persistKangurSessionScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
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
      subject: 'maths',
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
      subject: 'maths',
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

  it('stores guest scores in local storage when auth is required', async () => {
    authMeMock.mockRejectedValue(Object.assign(new Error('auth required'), { status: 401 }));
    createScoreMock.mockResolvedValue(undefined);
    window.sessionStorage.setItem('kangur.guest-player-name', 'Mila');

    await persistKangurSessionScore({
      operation: 'division',
      score: 7,
      totalQuestions: 8,
      correctAnswers: 7,
      timeTakenSeconds: 21,
      xpEarned: 30,
    });

    expect(createScoreMock).not.toHaveBeenCalled();
    const [storedScore] = loadGuestKangurScores();
    expect(storedScore).toEqual(
      expect.objectContaining({
        player_name: 'Mila',
        score: 7,
        operation: 'division',
        subject: 'maths',
        total_questions: 8,
        correct_answers: 7,
        time_taken: 21,
        xp_earned: 30,
      })
    );
  });

  it('stores guest scores quietly when auth resolves with a plain authentication-required error', async () => {
    authMeMock.mockRejectedValue(new Error('Authentication required'));
    window.sessionStorage.setItem('kangur.guest-player-name', 'Mila');

    await persistKangurSessionScore({
      operation: 'addition',
      score: 5,
      totalQuestions: 6,
      correctAnswers: 5,
      timeTakenSeconds: 19,
      xpEarned: 24,
    });

    expect(createScoreMock).not.toHaveBeenCalled();
    const [storedScore] = loadGuestKangurScores();
    expect(storedScore).toEqual(
      expect.objectContaining({
        player_name: 'Mila',
        score: 5,
        operation: 'addition',
        subject: 'maths',
        total_questions: 6,
        correct_answers: 5,
        time_taken: 19,
        xp_earned: 24,
      })
    );
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('stores guest scores quietly when score creation requires authentication', async () => {
    authMeMock.mockResolvedValue({
      full_name: 'Ada Lovelace',
      activeLearner: { displayName: 'Ada' },
    });
    createScoreMock.mockRejectedValue(new Error('Authentication required'));

    await persistKangurSessionScore({
      operation: 'clock',
      score: 4,
      totalQuestions: 6,
      correctAnswers: 4,
      timeTakenSeconds: 27,
      xpEarned: 18,
    });

    const [storedScore] = loadGuestKangurScores();
    expect(storedScore).toEqual(
      expect.objectContaining({
        player_name: 'Ada Lovelace',
        score: 4,
        operation: 'clock',
        subject: 'maths',
        total_questions: 6,
        correct_answers: 4,
        time_taken: 27,
        xp_earned: 18,
      })
    );
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
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
      subject: 'maths',
      total_questions: 6,
      correct_answers: 4,
      time_taken: 30,
      xp_earned: 18,
    });
  });
});
