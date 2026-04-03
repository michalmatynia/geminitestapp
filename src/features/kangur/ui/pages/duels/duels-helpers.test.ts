import { describe, expect, it } from 'vitest';

import {
  buildWinnerSummary,
  formatElapsedTime,
  formatRelativeAge,
} from './duels-helpers';
import type { KangurDuelPlayer } from '@/features/kangur/shared/contracts/kangur-duels';

const t = (key: string, values?: Record<string, unknown>): string => {
  if (values?.['name']) {
    return `${key}:${String(values['name'])}`;
  }
  if (typeof values?.['count'] === 'number') {
    return `${key}:${values['count']}`;
  }
  return key;
};

const makePlayer = (overrides: Partial<KangurDuelPlayer> = {}): KangurDuelPlayer => ({
  id: overrides.id ?? 'player-1',
  displayName: overrides.displayName ?? 'Player',
  status: overrides.status ?? 'completed',
  score: overrides.score ?? 5,
  bonusPoints: overrides.bonusPoints ?? 0,
  completedAt: overrides.completedAt ?? null,
  createdAt: overrides.createdAt ?? '2026-04-03T12:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-04-03T12:00:00.000Z',
  joinedAt: overrides.joinedAt ?? '2026-04-03T12:00:00.000Z',
  lobbyId: overrides.lobbyId ?? 'lobby-1',
  userId: overrides.userId ?? null,
  avatarUrl: overrides.avatarUrl ?? null,
  isHost: overrides.isHost ?? false,
  seat: overrides.seat ?? 0,
  correctAnswers: overrides.correctAnswers ?? 0,
  totalAnswers: overrides.totalAnswers ?? 0,
} as KangurDuelPlayer);

describe('duels-helpers', () => {
  it('picks the fastest completed top scorer when completion times differ', () => {
    const summary = buildWinnerSummary(
      [
        makePlayer({
          id: 'player-a',
          displayName: 'A',
          completedAt: '2026-04-03T12:00:05.000Z',
        }),
        makePlayer({
          id: 'player-b',
          displayName: 'B',
          completedAt: '2026-04-03T12:00:03.000Z',
        }),
      ],
      t
    );

    expect(summary).toBe('winner.wins:B');
  });

  it('falls back to tie when the fastest top scorers finish at the same time', () => {
    const summary = buildWinnerSummary(
      [
        makePlayer({
          id: 'player-a',
          displayName: 'A',
          completedAt: '2026-04-03T12:00:03.000Z',
        }),
        makePlayer({
          id: 'player-b',
          displayName: 'B',
          completedAt: '2026-04-03T12:00:03.000Z',
        }),
      ],
      t
    );

    expect(summary).toBe('winner.tie');
  });

  it('falls back to tie when top scorers have no valid completion times', () => {
    const summary = buildWinnerSummary(
      [
        makePlayer({
          id: 'player-a',
          displayName: 'A',
          completedAt: null,
        }),
        makePlayer({
          id: 'player-b',
          displayName: 'B',
          completedAt: 'not-a-date',
        }),
      ],
      t
    );

    expect(summary).toBe('winner.tie');
  });

  it('formats elapsed and relative time labels defensively', () => {
    expect(
      formatElapsedTime('2026-04-03T12:00:00.000Z', '2026-04-03T12:01:05.000Z')
    ).toBe('2 min');
    expect(formatElapsedTime('bad', '2026-04-03T12:01:05.000Z')).toBeNull();
    expect(formatRelativeAge('2026-04-03T12:00:00.000Z', Date.parse('2026-04-03T12:02:00.000Z'), t)).toBe(
      'relative.minutesAgo:2'
    );
  });
});
