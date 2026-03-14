import { describe, expect, it } from 'vitest';

import { resolveKangurAiTutorMoodFromSignals } from './ai-tutor-mood';

describe('resolveKangurAiTutorMoodFromSignals', () => {
  it('prefers a focused mood during an active unanswered test', () => {
    const mood = resolveKangurAiTutorMoodFromSignals({
      averageAccuracy: 92,
      dailyGoalPercent: 50,
      todayXpEarned: 48,
      weeklyXpEarned: 160,
      averageXpPerSession: 24,
      perfectGames: 1,
      currentStreakDays: 2,
      currentLessonMasteryPercent: null,
      context: {
        surface: 'test',
        contentId: 'suite-1',
        questionId: 'q-1',
        promptMode: 'hint',
        answerRevealed: false,
      },
      messages: [
        {
          role: 'user',
          content: 'Pomoz mi z tym pytaniem.',
        },
      ],
      latestUserMessage: 'Pomoz mi z tym pytaniem.',
      personaSuggestedMoodId: 'encouraging',
      previousMood: null,
      computedAt: '2026-03-08T12:00:00.000Z',
    });

    expect(mood).toMatchObject({
      currentMoodId: 'focused',
      baselineMoodId: 'confident',
      lastReasonCode: 'active_test_focus',
    });
  });

  it('switches to a reflective mood for post-answer review flows', () => {
    const mood = resolveKangurAiTutorMoodFromSignals({
      averageAccuracy: 88,
      dailyGoalPercent: 100,
      todayXpEarned: 52,
      weeklyXpEarned: 180,
      averageXpPerSession: 26,
      perfectGames: 2,
      currentStreakDays: 6,
      currentLessonMasteryPercent: null,
      context: {
        surface: 'test',
        contentId: 'suite-1',
        questionId: 'q-1',
        promptMode: 'chat',
        answerRevealed: true,
        interactionIntent: 'review',
      },
      messages: [
        {
          role: 'user',
          content: 'Chce zrozumieć, gdzie zrobilem blad.',
        },
      ],
      latestUserMessage: 'Chce zrozumieć, gdzie zrobilem blad.',
      personaSuggestedMoodId: 'thinking',
      previousMood: null,
      computedAt: '2026-03-08T12:00:00.000Z',
    });

    expect(mood).toMatchObject({
      currentMoodId: 'reflective',
      baselineMoodId: 'confident',
      lastReasonCode: 'post_answer_review',
    });
  });

  it('stays patient for struggling learners who communicate frustration', () => {
    const mood = resolveKangurAiTutorMoodFromSignals({
      averageAccuracy: 48,
      dailyGoalPercent: 0,
      todayXpEarned: 0,
      weeklyXpEarned: 12,
      averageXpPerSession: 10,
      perfectGames: 0,
      currentStreakDays: 0,
      currentLessonMasteryPercent: 32,
      context: {
        surface: 'lesson',
        contentId: 'adding',
        promptMode: 'selected_text',
        selectedText: '4 + 7',
      },
      messages: [
        {
          role: 'user',
          content: 'Nie rozumiem tego, to trudne i nie wychodzi mi.',
        },
      ],
      latestUserMessage: 'Nie rozumiem tego, to trudne i nie wychodzi mi.',
      personaSuggestedMoodId: 'encouraging',
      previousMood: null,
      computedAt: '2026-03-08T12:00:00.000Z',
    });

    expect(mood).toMatchObject({
      currentMoodId: 'patient',
      baselineMoodId: 'patient',
      lastReasonCode: 'learner_frustration',
    });
    expect(mood.confidence).toBeGreaterThan(0.35);
  });

  it('shifts toward a proud tone when xp momentum is strong even without a perfect-game trigger', () => {
    const mood = resolveKangurAiTutorMoodFromSignals({
      averageAccuracy: 74,
      dailyGoalPercent: 67,
      todayXpEarned: 42,
      weeklyXpEarned: 132,
      averageXpPerSession: 20,
      perfectGames: 0,
      currentStreakDays: 3,
      currentLessonMasteryPercent: null,
      context: {
        surface: 'lesson',
        contentId: 'clock',
        promptMode: 'chat',
      },
      messages: [
        {
          role: 'user',
          content: 'Chcę zrobić jeszcze jedno zadanie.',
        },
      ],
      latestUserMessage: 'Chcę zrobić jeszcze jedno zadanie.',
      personaSuggestedMoodId: 'neutral',
      previousMood: null,
      computedAt: '2026-03-08T12:00:00.000Z',
    });

    expect(mood).toMatchObject({
      currentMoodId: 'proud',
      baselineMoodId: 'encouraging',
      lastReasonCode: 'xp_momentum_today',
    });
  });
});
