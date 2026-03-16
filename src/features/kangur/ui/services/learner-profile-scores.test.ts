import { describe, expect, it, vi } from 'vitest';

import type { KangurScorePort, KangurScoreRecord } from '@/features/kangur/services/ports';

import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  loadLearnerProfileScores,
  loadScopedKangurScores,
} from './learner-profile-scores';

const createScore = (overrides: Partial<KangurScoreRecord> = {}): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  subject: 'maths',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

const createScorePort = (): KangurScorePort => ({
  create: vi.fn(),
  list: vi.fn(),
  filter: vi.fn(),
});

describe('loadLearnerProfileScores', () => {
  it('returns no scores and skips API calls when both identity fields are empty', async () => {
    const scorePort = createScorePort();

    const result = await loadLearnerProfileScores(scorePort, {
      userName: '   ',
      userEmail: '',
    });

    expect(result).toEqual([]);
    expect(scorePort.filter).not.toHaveBeenCalled();
  });

  it('loads scores by email and name using default limit and de-duplicates by score id', async () => {
    const scorePort = createScorePort();
    const filterMock = vi.mocked(scorePort.filter);
    filterMock.mockImplementation((criteria) => {
      if (criteria.created_by) {
        return Promise.resolve([
          createScore({ id: 'score-email', created_date: '2026-03-04T12:00:00.000Z' }),
          createScore({ id: 'shared-score', created_date: '2026-03-05T12:00:00.000Z' }),
        ]);
      }
      if (criteria.player_name) {
        return Promise.resolve([
          createScore({
            id: 'shared-score',
            operation: 'division',
            created_date: '2026-03-05T12:00:00.000Z',
          }),
          createScore({
            id: 'score-name',
            operation: 'multiplication',
            created_date: '2026-03-06T12:00:00.000Z',
          }),
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await loadLearnerProfileScores(scorePort, {
      userName: ' Jan ',
      userEmail: ' jan@example.com ',
    });

    expect(scorePort.filter).toHaveBeenCalledTimes(2);
    expect(scorePort.filter).toHaveBeenNthCalledWith(
      1,
      { created_by: 'jan@example.com' },
      '-created_date',
      LEARNER_PROFILE_SCORE_FETCH_LIMIT
    );
    expect(scorePort.filter).toHaveBeenNthCalledWith(
      2,
      { player_name: 'Jan' },
      '-created_date',
      LEARNER_PROFILE_SCORE_FETCH_LIMIT
    );
    expect(result.map((score) => score.id)).toEqual(['score-name', 'shared-score', 'score-email']);
    expect(result[1]?.operation).toBe('division');
  });

  it('queries only one identity field and respects explicit fetch limit', async () => {
    const scorePort = createScorePort();
    const filterMock = vi.mocked(scorePort.filter);
    filterMock.mockResolvedValue([createScore({ id: 'score-email-only' })]);

    const result = await loadLearnerProfileScores(scorePort, {
      userName: '',
      userEmail: 'anna@example.com',
      limit: 20,
    });

    expect(scorePort.filter).toHaveBeenCalledTimes(1);
    expect(scorePort.filter).toHaveBeenCalledWith(
      { created_by: 'anna@example.com' },
      '-created_date',
      20
    );
    expect(result.map((score) => score.id)).toEqual(['score-email-only']);
  });
});

describe('loadScopedKangurScores', () => {
  it('returns recent global scores when fallback mode is enabled and no learner identity is provided', async () => {
    const scorePort = createScorePort();
    const filterMock = vi.mocked(scorePort.filter);
    filterMock.mockResolvedValue([
      createScore({ id: 'score-older', created_date: '2026-03-04T10:00:00.000Z' }),
      createScore({ id: 'score-newer', created_date: '2026-03-06T15:00:00.000Z' }),
    ]);

    const result = await loadScopedKangurScores(scorePort, {
      fallbackToAll: true,
      limit: 20,
    });

    expect(scorePort.filter).toHaveBeenCalledTimes(1);
    expect(scorePort.filter).toHaveBeenCalledWith({}, '-created_date', 20);
    expect(result.map((score) => score.id)).toEqual(['score-newer', 'score-older']);
  });
});
