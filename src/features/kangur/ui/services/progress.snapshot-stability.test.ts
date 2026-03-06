import { beforeEach, describe, expect, it, vi } from 'vitest';

const KANGUR_PROGRESS_STORAGE_KEY = 'mathblast_progress';

describe('loadProgress', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('returns a stable snapshot reference when storage key ordering differs', async () => {
    localStorage.setItem(
      KANGUR_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        gamesPlayed: 22,
        totalXp: 620,
        perfectGames: 6,
        lessonsCompleted: 9,
        clockPerfect: 2,
        calendarPerfect: 1,
        geometryPerfect: 1,
        badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
        operationsPlayed: ['addition', 'multiplication', 'division'],
        lessonMastery: {},
      })
    );

    const { loadProgress } = await import('@/features/kangur/ui/services/progress');
    const first = loadProgress();
    const second = loadProgress();

    expect(first.totalXp).toBe(620);
    expect(second).toBe(first);
  });
});
