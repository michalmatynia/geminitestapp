import { describe, expect, it } from 'vitest';

import { resolveKangurAiTutorMoodFromSignals } from './ai-tutor-mood';

describe('resolveKangurAiTutorMoodFromSignals', () => {
  it('prefers a focused mood during an active unanswered test', () => {
    const mood = resolveKangurAiTutorMoodFromSignals({
      averageAccuracy: 92,
      dailyGoalPercent: 50,
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
          content: 'Chce zrozumiec, gdzie zrobilem blad.',
        },
      ],
      latestUserMessage: 'Chce zrozumiec, gdzie zrobilem blad.',
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
});
