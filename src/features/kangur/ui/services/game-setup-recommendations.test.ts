import { describe, expect, it } from 'vitest';

import {
  getRecommendedKangurMode,
  getRecommendedTrainingSetup,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const createTranslator = (messages: Record<string, string>) => {
  return (key: string, values?: Record<string, string | number>): string => {
    const template = messages[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
      String(values?.[token] ?? `{${token}}`)
    );
  };
};

const buildProgress = (
  overrides: Partial<KangurProgressState> = {}
): KangurProgressState => ({
  totalXp: 420,
  gamesPlayed: 8,
  perfectGames: 2,
  lessonsCompleted: 3,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['division'],
  lessonMastery: {},
  totalCorrectAnswers: 32,
  totalQuestionsAnswered: 40,
  currentWinStreak: 2,
  bestWinStreak: 4,
  activityStats: {
    'game:division': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalXpEarned: 180,
      totalCorrectAnswers: 16,
      totalQuestionsAnswered: 20,
      bestScorePercent: 90,
      currentStreak: 1,
      bestStreak: 3,
    },
  },
  ...overrides,
});

describe('game setup recommendations', () => {
  it('prefers the weakest mapped lesson for training defaults', () => {
    const recommendation = getRecommendedTrainingSetup(
      buildProgress({
        lessonMastery: {
          division: {
            attempts: 3,
            completions: 3,
            masteryPercent: 48,
            bestScorePercent: 64,
            lastScorePercent: 52,
            lastCompletedAt: '2026-03-10T09:00:00.000Z',
          },
        },
      })
    );

    expect(recommendation.label).toBe('Nadrabiamy lekcję');
    expect(recommendation.selection).toEqual({
      categories: ['division'],
      count: 10,
      difficulty: 'easy',
    });
  });

  it('falls back to a gentle starter preset for brand new players', () => {
    const recommendation = getRecommendedTrainingSetup(
      buildProgress({
        gamesPlayed: 0,
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
      })
    );

    expect(recommendation.label).toBe('Start');
    expect(recommendation.selection).toEqual({
      categories: ['addition', 'subtraction'],
      count: 5,
      difficulty: 'easy',
    });
  });

  it('returns English starter copy when a translator is provided', () => {
    const translate = createTranslator({
      'training.starter.description':
        'A gentle start with two categories helps build rhythm without overload in the first session.',
      'training.starter.label': 'Start',
      'training.starter.title': 'Recommended starter practice',
    });
    const recommendation = getRecommendedTrainingSetup(
      buildProgress({
        gamesPlayed: 0,
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
      }),
      {
        locale: 'en',
        translate,
      }
    );

    expect(recommendation.label).toBe('Start');
    expect(recommendation.title).toBe('Recommended starter practice');
    expect(recommendation.description).toContain('A gentle start');
  });

  it('chooses the full kangur test only for truly competition-ready learners', () => {
    const recommendation = getRecommendedKangurMode(
      buildProgress({
        gamesPlayed: 15,
        perfectGames: 4,
        totalCorrectAnswers: 92,
        totalQuestionsAnswered: 100,
        currentWinStreak: 4,
      })
    );

    expect(recommendation.mode).toBe('full_test_2024');
    expect(recommendation.label).toBe('Gotowość konkursowa');
  });

  it('returns English Kangur mode copy when a translator is provided', () => {
    const translate = createTranslator({
      'mode.competitionReady.description':
        'You have strong pace and high accuracy. The full competition test should deliver the best progress.',
      'mode.competitionReady.label': 'Competition ready',
      'mode.competitionReady.title': 'We recommend the full competition test',
    });
    const recommendation = getRecommendedKangurMode(
      buildProgress({
        gamesPlayed: 15,
        perfectGames: 4,
        totalCorrectAnswers: 92,
        totalQuestionsAnswered: 100,
        currentWinStreak: 4,
      }),
      {
        locale: 'en',
        translate,
      }
    );

    expect(recommendation.label).toBe('Competition ready');
    expect(recommendation.title).toBe('We recommend the full competition test');
  });
});
