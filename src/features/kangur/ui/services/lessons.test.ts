import { describe, expect, it } from 'vitest';

import {
  KANGUR_PORTABLE_LESSONS,
  buildActiveKangurLessonAssignmentsByComponent,
  buildCompletedKangurLessonAssignmentsByComponent,
  getKangurPortableLessonBody,
  getKangurLessonMasteryPresentation,
  getLocalizedKangurPortableLessons,
  orderKangurLessonsByAssignmentPriority,
  resolveFocusedKangurLessonId,
} from '@kangur/core';
import type { KangurAssignmentSnapshot, KangurProgressState } from '@kangur/contracts';

const progress: KangurProgressState = {
  totalXp: 320,
  gamesPlayed: 8,
  perfectGames: 2,
  lessonsCompleted: 4,
  clockPerfect: 1,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['division'],
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    },
  },
};

const createLessonAssignment = (
  overrides: Partial<KangurAssignmentSnapshot>,
): KangurAssignmentSnapshot => ({
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Powtorka dzielenia',
  description: 'Wroc do dzielenia i popraw wynik.',
  priority: 'medium',
  archived: false,
  target: {
    type: 'lesson',
    lessonComponentId: 'division',
  },
  assignedByName: null,
  assignedByEmail: null,
  createdAt: '2026-03-06T08:00:00.000Z',
  updatedAt: '2026-03-06T08:30:00.000Z',
  progress: {
    status: 'not_started',
    percent: 0,
    summary: 'Czeka na wykonanie',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
  ...overrides,
});

describe('shared lessons helpers', () => {
  it('resolves focus tokens to the matching portable lesson', () => {
    expect(resolveFocusedKangurLessonId('division', KANGUR_PORTABLE_LESSONS)).toBe(
      'kangur-lesson-division',
    );
    expect(resolveFocusedKangurLessonId('figury', KANGUR_PORTABLE_LESSONS)).toBe(
      'kangur-lesson-geometry-shapes',
    );
  });

  it('builds lesson mastery labels from shared progress state', () => {
    const lesson = KANGUR_PORTABLE_LESSONS.find(
      (candidate) => candidate.componentId === 'division',
    )!;
    const presentation = getKangurLessonMasteryPresentation(lesson, progress);

    expect(presentation).toMatchObject({
      statusLabel: 'Powtórz 45%',
      badgeAccent: 'rose',
    });
    expect(presentation.summaryLabel).toContain('ostatni wynik 40%');
  });

  it('localizes portable lesson catalog entries and mastery presentation in German', () => {
    const lesson = getLocalizedKangurPortableLessons('de').find(
      (candidate) => candidate.componentId === 'division',
    )!;
    const presentation = getKangurLessonMasteryPresentation(lesson, progress, 'de');

    expect(lesson.title).toBe('Division');
    expect(lesson.description).toBe('Grundlagen der Division und Reste.');
    expect(presentation.statusLabel).toBe('Wiederhole 45%');
    expect(presentation.summaryLabel).toContain('letztes Ergebnis 40%');
  });

  it('prefers the highest priority active lesson assignment and sorts lessons around it', () => {
    const activeAssignments = buildActiveKangurLessonAssignmentsByComponent([
      createLessonAssignment({
        id: 'a-medium',
        priority: 'medium',
      }),
      createLessonAssignment({
        id: 'a-high',
        priority: 'high',
      }),
    ]);

    expect(activeAssignments.get('division')?.id).toBe('a-high');

    const ordered = orderKangurLessonsByAssignmentPriority(
      KANGUR_PORTABLE_LESSONS.filter((lesson) =>
        lesson.componentId === 'division' || lesson.componentId === 'adding',
      ),
      activeAssignments,
    );

    expect(ordered[0]?.componentId).toBe('division');
    expect(ordered[1]?.componentId).toBe('adding');
  });

  it('keeps only the newest completed lesson assignment per component', () => {
    const completedAssignments = buildCompletedKangurLessonAssignmentsByComponent([
      createLessonAssignment({
        id: 'completed-older',
        progress: {
          status: 'completed',
          percent: 100,
          summary: 'Starsze ukonczenie',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-05T09:00:00.000Z',
          completedAt: '2026-03-05T09:00:00.000Z',
        },
        updatedAt: '2026-03-05T09:00:00.000Z',
      }),
      createLessonAssignment({
        id: 'completed-newer',
        progress: {
          status: 'completed',
          percent: 100,
          summary: 'Nowsze ukonczenie',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-06T09:00:00.000Z',
          completedAt: '2026-03-06T09:00:00.000Z',
        },
        updatedAt: '2026-03-06T09:00:00.000Z',
      }),
    ]);

    expect(completedAssignments.get('division')?.id).toBe('completed-newer');
  });

  it('exposes portable lesson bodies for the first mobile lesson ports', () => {
    expect(getKangurPortableLessonBody('adding')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('subtracting')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('multiplication')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('division')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('clock')?.sections).toHaveLength(3);
    expect(getKangurPortableLessonBody('calendar')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('geometry_basics')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('geometry_shapes')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('geometry_symmetry')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('geometry_perimeter')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('logical_thinking')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('logical_patterns')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('logical_classification')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('logical_reasoning')?.sections).toHaveLength(4);
    expect(getKangurPortableLessonBody('logical_analogies')?.sections).toHaveLength(4);
  });

  it('localizes portable lesson bodies in English', () => {
    const lessonBody = getKangurPortableLessonBody('clock', 'en');

    expect(lessonBody?.introduction).toContain('The clock lesson has three stages');
    expect(lessonBody?.sections[0]?.title).toBe('Hours and the short hand');
    expect(lessonBody?.practiceNote).toContain('interactive clock exercise');
  });

  it('localizes geometry lesson bodies in German', () => {
    const lessonBody = getKangurPortableLessonBody('geometry_symmetry', 'de');

    expect(lessonBody?.introduction).toContain('Symmetrie hilft dir zu erkennen');
    expect(lessonBody?.sections[1]?.title).toBe('Symmetrieachse');
    expect(lessonBody?.practiceNote).toContain('Symmetrieachsen');
  });
});
