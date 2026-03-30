/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

import {
  claimCurrentKangurDailyQuestReward,
  getCurrentKangurDailyQuest,
  getKangurDailyQuestStorageKey,
} from '../daily-quests';

const progressWithWeakLesson: KangurProgressState = {
  totalXp: 540,
  gamesPlayed: 12,
  perfectGames: 3,
  lessonsCompleted: 7,
  clockPerfect: 1,
  calendarPerfect: 1,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    },
    adding: {
      attempts: 3,
      completions: 3,
      masteryPercent: 67,
      bestScorePercent: 80,
      lastScorePercent: 70,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    },
  },
};

const progressAfterRecovery: KangurProgressState = {
  ...progressWithWeakLesson,
  gamesPlayed: 13,
  lessonMastery: {
    ...progressWithWeakLesson.lessonMastery,
    division: {
      ...progressWithWeakLesson.lessonMastery.division!,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-10T11:00:00.000Z',
    },
  },
};

const progressWithoutHighPriority: KangurProgressState = {
  ...progressWithWeakLesson,
  lessonMastery: {
    adding: {
      attempts: 3,
      completions: 3,
      masteryPercent: 68,
      bestScorePercent: 80,
      lastScorePercent: 72,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    },
  },
};

describe('getCurrentKangurDailyQuest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the same stored quest for the whole day and updates its live progress', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    const firstQuest = getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });
    const updatedQuest = getCurrentKangurDailyQuest(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    expect(firstQuest?.assignment.id).toBe('lesson-retry-division');
    expect(updatedQuest?.assignment.id).toBe('lesson-retry-division');
    expect(updatedQuest?.progress.status).toBe('completed');
    expect(updatedQuest?.progress.summary).toBe('82% / 75% opanowania');
    expect(updatedQuest?.reward.status).toBe('ready');
  });

  it('rolls over to a fresh quest after the stored day expires', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    const firstQuest = getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    vi.setSystemTime(new Date('2026-03-11T09:00:00.000Z'));
    const nextDayQuest = getCurrentKangurDailyQuest(progressWithoutHighPriority, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    expect(firstQuest?.dateKey).toBe('2026-03-10');
    expect(nextDayQuest?.dateKey).toBe('2026-03-11');
    expect(nextDayQuest?.assignment.id).not.toBe(firstQuest?.assignment.id);
    expect(
      window.localStorage.getItem(getKangurDailyQuestStorageKey('maths', 'learner-1'))
    ).toContain('2026-03-11');
  });

  it('awards the daily quest bonus only once after completion', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    const firstClaim = claimCurrentKangurDailyQuestReward(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });
    const secondClaim = claimCurrentKangurDailyQuestReward(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    expect(firstClaim.xpAwarded).toBe(55);
    expect(firstClaim.quest?.reward.status).toBe('claimed');
    expect(secondClaim.xpAwarded).toBe(0);
    expect(secondClaim.quest?.reward.status).toBe('claimed');
  });

  it('retains separate same-day quest state for each learner', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });
    const learnerOneClaim = claimCurrentKangurDailyQuestReward(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-2',
      subject: 'maths',
    });
    const learnerTwoQuest = getCurrentKangurDailyQuest(progressAfterRecovery, {
      ownerKey: 'learner-2',
      subject: 'maths',
    });
    const learnerOneQuest = getCurrentKangurDailyQuest(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    expect(learnerOneClaim.quest?.reward.status).toBe('claimed');
    expect(learnerOneQuest?.reward.status).toBe('claimed');
    expect(learnerTwoQuest?.reward.status).toBe('ready');
    expect(
      window.localStorage.getItem(getKangurDailyQuestStorageKey('maths', 'learner-1'))
    ).toContain('"claimedAt":"2026-03-10T09:00:00.000Z"');
    expect(
      window.localStorage.getItem(getKangurDailyQuestStorageKey('maths', 'learner-2'))
    ).toContain('"claimedAt":null');
  });

  it('migrates a legacy subject quest into the matching learner scoped key', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    window.localStorage.setItem(
      'kangur_daily_quest_v1:maths',
      JSON.stringify({
        version: 1,
        dateKey: '2026-03-10',
        ownerKey: 'learner-legacy',
        createdAt: '2026-03-10T08:00:00.000Z',
        expiresAt: '2026-03-10T23:59:59.999Z',
        claimedAt: null,
        baselineGamesPlayed: 12,
        baselineLessonsCompleted: 7,
        subject: 'maths',
        assignment: {
          id: 'lesson-retry-division',
          title: 'Powtórka: Dzielenie',
          description: 'Powtórz dzielenie.',
          target: '1 powtórka + wynik min. 75%',
          priority: 'high',
          rewardXp: 55,
          questMetric: {
            kind: 'lesson_mastery',
            lessonComponentId: 'division',
            targetPercent: 75,
          },
        },
      })
    );

    const quest = getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-legacy',
      subject: 'maths',
    });

    expect(quest?.assignment.id).toBe('lesson-retry-division');
    expect(window.localStorage.getItem('kangur_daily_quest_v1:maths')).toBeNull();
    expect(
      window.localStorage.getItem(getKangurDailyQuestStorageKey('maths', 'learner-legacy'))
    ).toContain('"ownerKey":"learner-legacy"');
  });

  it('localizes quest runtime labels when a translator is provided', () => {
    vi.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));

    const translate = (key: string, values?: Record<string, string | number>) => {
      switch (key) {
        case 'dailyQuest.progress.lessonMastery':
          return `${values?.['current']}% / ${values?.['target']}% mastery`;
        case 'dailyQuest.reward.ready':
          return `Reward ready +${values?.['xp']} XP`;
        case 'dailyQuest.expiresToday':
          return 'Expires today';
        default:
          return key;
      }
    };

    getCurrentKangurDailyQuest(progressWithWeakLesson, {
      ownerKey: 'learner-1',
      subject: 'maths',
    });

    const localizedQuest = getCurrentKangurDailyQuest(progressAfterRecovery, {
      ownerKey: 'learner-1',
      subject: 'maths',
      translate,
    });

    expect(localizedQuest?.progress.summary).toBe('82% / 75% mastery');
    expect(localizedQuest?.reward.label).toBe('Reward ready +55 XP');
    expect(localizedQuest?.expiresLabel).toBe('Expires today');
  });
});
