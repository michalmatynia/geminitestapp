import { describe, expect, it } from 'vitest';

import { buildKangurEmbeddedBasePath } from '@/shared/contracts/kangur';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';

import {
  buildKangurAssignmentHref,
  mapKangurPracticeAssignmentsByOperation,
  parseKangurMixedTrainingQuickStartParams,
  selectKangurPracticeAssignmentForScreen,
  selectKangurPriorityAssignments,
  selectKangurResultPracticeAssignment,
} from './delegated-assignments';

const createAssignment = (
  overrides: Partial<KangurAssignmentSnapshot>
): KangurAssignmentSnapshot => ({
  id: 'assignment-1',
  learnerKey: 'jan@example.com',
  title: 'Praktyka: Dzielenie',
  description: 'Rozwiaz sesje dzielenia.',
  priority: 'medium',
  archived: false,
  target: {
    type: 'practice',
    operation: 'division',
    requiredAttempts: 1,
    minAccuracyPercent: 80,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  progress: {
    status: 'not_started',
    percent: 0,
    summary: 'Sesje: 0/1',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
  ...overrides,
});

describe('delegated assignments helpers', () => {
  it('orders active assignments by priority, progress, and recency', () => {
    const assignments = selectKangurPriorityAssignments([
      createAssignment({
        id: 'low',
        priority: 'low',
        createdAt: '2026-03-06T09:00:00.000Z',
        progress: {
          status: 'in_progress',
          percent: 30,
          summary: 'Sesje: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      }),
      createAssignment({
        id: 'high-newer',
        priority: 'high',
        createdAt: '2026-03-06T11:00:00.000Z',
      }),
      createAssignment({
        id: 'high-older',
        priority: 'high',
        createdAt: '2026-03-06T10:00:00.000Z',
      }),
      createAssignment({
        id: 'completed',
        progress: {
          status: 'completed',
          percent: 100,
          summary: 'Sesje: 1/1',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-06T10:20:00.000Z',
          completedAt: '2026-03-06T10:20:00.000Z',
        },
      }),
    ]);

    expect(assignments.map((assignment) => assignment.id)).toEqual([
      'high-newer',
      'high-older',
      'low',
    ]);
  });

  it('matches practice assignments to the relevant game screen context', () => {
    const mixedAssignment = createAssignment({
      id: 'mixed',
      priority: 'low',
      target: {
        type: 'practice',
        operation: 'mixed',
        requiredAttempts: 1,
        minAccuracyPercent: 70,
      },
    });
    const divisionAssignment = createAssignment({
      id: 'division',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    });

    expect(
      selectKangurPracticeAssignmentForScreen(
        [mixedAssignment, divisionAssignment],
        'training',
        null
      )?.id
    ).toBe('mixed');
    expect(
      selectKangurPracticeAssignmentForScreen(
        [mixedAssignment, divisionAssignment],
        'operation',
        null
      )?.id
    ).toBe('division');
    expect(
      selectKangurPracticeAssignmentForScreen(
        [mixedAssignment, divisionAssignment],
        'playing',
        'division'
      )?.id
    ).toBe('division');
    expect(
      selectKangurPracticeAssignmentForScreen(
        [mixedAssignment, divisionAssignment],
        'playing',
        'mixed'
      )?.id
    ).toBe('mixed');
    expect(
      selectKangurPracticeAssignmentForScreen(
        [mixedAssignment, divisionAssignment],
        'result',
        'addition'
      )
    ).toBeNull();
  });

  it('keeps the highest-priority active assignment for each practice operation', () => {
    const mappedAssignments = mapKangurPracticeAssignmentsByOperation([
      createAssignment({
        id: 'division-high',
        priority: 'high',
        target: {
          type: 'practice',
          operation: 'division',
          requiredAttempts: 1,
          minAccuracyPercent: 80,
        },
      }),
      createAssignment({
        id: 'division-low',
        priority: 'low',
        target: {
          type: 'practice',
          operation: 'division',
          requiredAttempts: 1,
          minAccuracyPercent: 70,
        },
      }),
      createAssignment({
        id: 'mixed-medium',
        priority: 'medium',
        target: {
          type: 'practice',
          operation: 'mixed',
          requiredAttempts: 1,
          minAccuracyPercent: 70,
        },
      }),
    ]);

    expect(mappedAssignments.division?.id).toBe('division-high');
    expect(mappedAssignments.mixed?.id).toBe('mixed-medium');
  });

  it('builds mixed practice assignment links with a preset delegated training session', () => {
    const href = buildKangurAssignmentHref(
      '/kangur',
      createAssignment({
        target: {
          type: 'practice',
          operation: 'mixed',
          requiredAttempts: 1,
          minAccuracyPercent: 70,
        },
      })
    );
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/kangur/game');
    expect(url.searchParams.get('quickStart')).toBe('training');
    expect(url.searchParams.get('categories')).toBe(
      'addition,subtraction,multiplication,division,decimals,powers,roots'
    );
    expect(url.searchParams.get('count')).toBe('10');
    expect(url.searchParams.get('difficulty')).toBe('medium');
  });

  it('builds embedded lesson assignment links on the cms host page', () => {
    const href = buildKangurAssignmentHref(
      buildKangurEmbeddedBasePath('/home?preview=1'),
      createAssignment({
        target: {
          type: 'lesson',
          lessonComponentId: 'division',
        },
      })
    );

    expect(href).toBe('/home?preview=1&kangur=lessons&focus=division');
  });

  it('parses delegated mixed training quick-start params into a ready training preset', () => {
    const preset = parseKangurMixedTrainingQuickStartParams(
      new URLSearchParams({
        categories: 'addition,division,decimals',
        count: '10',
        difficulty: 'medium',
      })
    );

    expect(preset).toEqual({
      categories: ['addition', 'division', 'decimals'],
      count: 10,
      difficulty: 'medium',
    });
  });

  it('prefers the active matching result assignment, then falls back to the latest completed one', () => {
    const activeDivisionAssignment = createAssignment({
      id: 'division-active',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
      progress: {
        status: 'in_progress',
        percent: 60,
        summary: 'Sesje: 0/1',
        attemptsCompleted: 0,
        attemptsRequired: 1,
        lastActivityAt: null,
        completedAt: null,
      },
    });
    const completedDivisionAssignment = createAssignment({
      id: 'division-completed',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
      progress: {
        status: 'completed',
        percent: 100,
        summary: 'Sesje: 1/1',
        attemptsCompleted: 1,
        attemptsRequired: 1,
        lastActivityAt: '2026-03-06T11:00:00.000Z',
        completedAt: '2026-03-06T11:00:00.000Z',
      },
      updatedAt: '2026-03-06T11:00:00.000Z',
    });

    expect(
      selectKangurResultPracticeAssignment(
        [completedDivisionAssignment, activeDivisionAssignment],
        'division'
      )?.id
    ).toBe('division-active');

    expect(
      selectKangurResultPracticeAssignment([completedDivisionAssignment], 'division')?.id
    ).toBe('division-completed');
  });
});
