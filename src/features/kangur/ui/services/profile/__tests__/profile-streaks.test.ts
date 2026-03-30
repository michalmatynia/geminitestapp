import { describe, expect, it } from 'vitest';

import type { KangurScoreRecord } from '@kangur/platform';
import { computeStreaks } from '../profile-streaks';

const createScore = (createdDate: string): KangurScoreRecord => ({
  id: createdDate,
  player_name: 'Ada',
  score: 8,
  operation: 'addition',
  subject: 'maths',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 30,
  created_date: createdDate,
  created_by: 'ada@example.com',
});

describe('computeStreaks', () => {
  it('returns empty streaks when there are no valid score dates', () => {
    expect(computeStreaks([], new Date('2026-03-10T12:00:00.000Z'))).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastPlayedAt: null,
    });
    expect(
      computeStreaks(
        [{ ...createScore('2026-03-10T12:00:00.000Z'), created_date: 'invalid-date' }],
        new Date('2026-03-10T12:00:00.000Z'),
      ),
    ).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastPlayedAt: null,
    });
  });

  it('tracks current and longest streaks across unique score days', () => {
    expect(
      computeStreaks(
        [
          createScore('2026-03-10T12:00:00.000Z'),
          createScore('2026-03-10T08:00:00.000Z'),
          createScore('2026-03-09T12:00:00.000Z'),
          createScore('2026-03-08T12:00:00.000Z'),
          createScore('2026-03-05T12:00:00.000Z'),
        ],
        new Date('2026-03-10T18:00:00.000Z'),
      ),
    ).toEqual({
      currentStreakDays: 3,
      longestStreakDays: 3,
      lastPlayedAt: '2026-03-10T12:00:00.000Z',
    });
  });

  it('keeps the longest streak when the latest activity is too old for a current streak', () => {
    expect(
      computeStreaks(
        [
          createScore('2026-03-06T12:00:00.000Z'),
          createScore('2026-03-05T12:00:00.000Z'),
          createScore('2026-03-04T12:00:00.000Z'),
          createScore('2026-03-02T12:00:00.000Z'),
        ],
        new Date('2026-03-10T18:00:00.000Z'),
      ),
    ).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 3,
      lastPlayedAt: '2026-03-06T12:00:00.000Z',
    });
  });
});
