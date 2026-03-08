import { describe, expect, it } from 'vitest';

import {
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  generateTrainingQuestions,
  getKangurPracticeOperationForLessonComponent,
  isKangurLogicPracticeOperation,
  resolveKangurLessonFocusForPracticeOperation,
  resolvePreferredKangurPracticeOperation,
  resolveKangurPracticeOperation,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';

describe('shared practice helpers', () => {
  it('resolves unknown practice operations to mixed', () => {
    expect(resolveKangurPracticeOperation('addition')).toBe('addition');
    expect(resolveKangurPracticeOperation('multiplication')).toBe('multiplication');
    expect(resolveKangurPracticeOperation('logical_reasoning')).toBe(
      'logical_reasoning',
    );
    expect(resolveKangurPracticeOperation('something-else')).toBe('mixed');
    expect(resolveKangurPracticeOperation(null)).toBe('mixed');
  });

  it('maps portable lesson tracks to concrete mobile practice modes', () => {
    expect(getKangurPracticeOperationForLessonComponent('adding')).toBe('addition');
    expect(getKangurPracticeOperationForLessonComponent('subtracting')).toBe(
      'subtraction',
    );
    expect(getKangurPracticeOperationForLessonComponent('multiplication')).toBe(
      'multiplication',
    );
    expect(getKangurPracticeOperationForLessonComponent('division')).toBe('division');
    expect(getKangurPracticeOperationForLessonComponent('clock')).toBe('clock');
    expect(getKangurPracticeOperationForLessonComponent('calendar')).toBe(
      'calendar',
    );
    expect(getKangurPracticeOperationForLessonComponent('logical_patterns')).toBe(
      'logical_patterns',
    );
    expect(getKangurPracticeOperationForLessonComponent('logical_analogies')).toBe(
      'logical_analogies',
    );
    expect(resolvePreferredKangurPracticeOperation('logical_patterns')).toBe(
      'logical_patterns',
    );
    expect(resolvePreferredKangurPracticeOperation('adding')).toBe('addition');
    expect(resolvePreferredKangurPracticeOperation('clock')).toBe('clock');
    expect(resolvePreferredKangurPracticeOperation('calendar')).toBe('calendar');
    expect(resolveKangurLessonFocusForPracticeOperation('logical_patterns')).toBe(
      'logical_patterns',
    );
    expect(resolveKangurLessonFocusForPracticeOperation('addition')).toBe('adding');
    expect(resolveKangurLessonFocusForPracticeOperation('clock')).toBe('clock');
    expect(resolveKangurLessonFocusForPracticeOperation('calendar')).toBe(
      'calendar',
    );
    expect(resolveKangurLessonFocusForPracticeOperation('mixed')).toBeNull();
  });

  it('completes an arithmetic lesson practice and updates progress', () => {
    const result = completeKangurPracticeSession({
      progress: createDefaultKangurProgressState(),
      operation: 'addition',
      correctAnswers: 8,
      totalQuestions: 8,
    });

    expect(result.xpGained).toBeGreaterThan(0);
    expect(result.isPerfect).toBe(true);
    expect(result.updated.gamesPlayed).toBe(1);
    expect(result.updated.perfectGames).toBe(1);
    expect(result.updated.lessonsCompleted).toBe(1);
    expect(result.updated.operationsPlayed).toContain('addition');
    expect(result.updated.lessonMastery['adding']).toMatchObject({
      attempts: 1,
      completions: 1,
      bestScorePercent: 100,
      lastScorePercent: 100,
    });
    expect(result.newBadges).toEqual(expect.arrayContaining(['first_game', 'lesson_hero']));
  });

  it('keeps mixed practice out of lesson mastery while tracking multiple operations', () => {
    const progress = createDefaultKangurProgressState();
    const result = completeKangurPracticeSession({
      progress,
      operation: 'mixed',
      correctAnswers: 5,
      totalQuestions: 8,
    });

    expect(result.updated.lessonsCompleted).toBe(0);
    expect(result.updated.lessonMastery).toEqual({});
    expect(result.updated.operationsPlayed).toEqual(
      expect.arrayContaining([
        'addition',
        'subtraction',
        'multiplication',
        'division',
      ]),
    );
  });

  it('tracks multiplication practice as its own lesson-linked mode', () => {
    const result = completeKangurPracticeSession({
      progress: createDefaultKangurProgressState(),
      operation: 'multiplication',
      correctAnswers: 6,
      totalQuestions: 8,
    });

    expect(result.updated.lessonsCompleted).toBe(1);
    expect(result.updated.operationsPlayed).toContain('multiplication');
    expect(result.updated.lessonMastery['multiplication']).toMatchObject({
      attempts: 1,
      completions: 1,
      lastScorePercent: 75,
    });
  });

  it('generates text-based clock and calendar practice questions', () => {
    const [clockQuestion] = generateTrainingQuestions(['clock'], 'easy', 1);
    const [calendarQuestion] = generateTrainingQuestions(['calendar'], 'easy', 1);

    expect(clockQuestion).toMatchObject({
      category: 'clock',
    });
    expect(String(clockQuestion?.question).startsWith('CLOCK:')).toBe(true);
    expect(clockQuestion?.choices).toContain(clockQuestion?.answer);

    expect(calendarQuestion).toMatchObject({
      category: 'calendar',
    });
    expect(calendarQuestion?.choices).toContain(calendarQuestion?.answer);
  });

  it('tracks clock and calendar practice as lesson-linked mastery work', () => {
    const progress = createDefaultKangurProgressState();
    const clockResult = completeKangurPracticeSession({
      progress,
      operation: 'clock',
      correctAnswers: 6,
      totalQuestions: 8,
    });
    const calendarResult = completeKangurPracticeSession({
      progress: clockResult.updated,
      operation: 'calendar',
      correctAnswers: 5,
      totalQuestions: 8,
    });

    expect(clockResult.updated.operationsPlayed).toContain('clock');
    expect(clockResult.updated.lessonMastery['clock']).toMatchObject({
      attempts: 1,
      completions: 1,
      lastScorePercent: 75,
    });
    expect(calendarResult.updated.operationsPlayed).toContain('calendar');
    expect(calendarResult.updated.lessonMastery['calendar']).toMatchObject({
      attempts: 1,
      completions: 1,
      lastScorePercent: 63,
    });
  });

  it('generates text-based logic practice questions and marks them as logic mode', () => {
    const questions = generateKangurLogicPracticeQuestions('logical_patterns', 4);

    expect(isKangurLogicPracticeOperation('logical_patterns')).toBe(true);
    expect(isKangurLogicPracticeOperation('addition')).toBe(false);
    expect(questions).toHaveLength(4);
    expect(questions[0]).toMatchObject({
      category: 'logical_patterns',
    });
    expect(questions[0]?.choices).toContain(questions[0]?.answer);
  });

  it('tracks logic practice as lesson-linked mastery work', () => {
    const result = completeKangurPracticeSession({
      progress: createDefaultKangurProgressState(),
      operation: 'logical_reasoning',
      correctAnswers: 7,
      totalQuestions: 8,
    });

    expect(result.updated.lessonsCompleted).toBe(1);
    expect(result.updated.operationsPlayed).toContain('logical_reasoning');
    expect(result.updated.lessonMastery['logical_reasoning']).toMatchObject({
      attempts: 1,
      completions: 1,
      lastScorePercent: 88,
    });
  });
});
