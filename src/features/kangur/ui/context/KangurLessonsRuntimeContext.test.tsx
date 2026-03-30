/**
 * @vitest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  focusTokenState,
  lessonAssignmentsHookCallsMock,
  lessonTemplateHookCallsMock,
} = vi.hoisted(() => ({
  authState: {
    value: {
      user: null,
      canAccessParentAssignments: false,
    },
  },
  focusTokenState: {
    value: null as string | null,
  },
  lessonAssignmentsHookCallsMock: vi.fn(),
  lessonTemplateHookCallsMock: vi.fn(),
}));

vi.mock('@/features/kangur/config/routing', () => ({
  getKangurInternalQueryParamName: () => 'focus',
  readKangurUrlParam: () => focusTokenState.value,
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: 'ten_year_old',
    setAgeGroup: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'english',
    setSubject: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: (options?: { enabled?: boolean }) => {
    lessonAssignmentsHookCallsMock(options ?? {});
    return {
    assignments: [],
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => ({
    totalXp: 0,
    gamesPlayed: 0,
    lessonsCompleted: 0,
    badges: [],
    lessonMastery: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplate: (
    componentId: string | null,
    options?: { enabled?: boolean }
  ) => {
    lessonTemplateHookCallsMock({ componentId, ...(options ?? {}) });
    return {
      data: null,
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonsCatalog', () => ({
  useKangurLessonsCatalog: () => ({
    data: {
      lessons: [
        {
          id: 'lesson-english',
          componentId: 'english_basics',
          subject: 'english',
          ageGroup: 'ten_year_old',
          sortOrder: 1,
          title: 'English Basics',
        },
      ],
      sections: [],
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessonDocument: () => ({
    data: null,
  }),
}));

vi.mock('./KangurLessonsRuntimeContext.shared', () => ({
  getLessonAssignmentTimestamp: () => 0,
  LESSON_ASSIGNMENT_PRIORITY_ORDER: {
    high: 0,
    medium: 1,
    low: 2,
  },
  LESSON_COMPONENTS: {},
  resolveFocusedLessonId: () => null,
  resolveFocusedLessonScope: () => null,
}));

import { KangurLessonsRuntimeProvider } from './KangurLessonsRuntimeContext';

describe('KangurLessonsRuntimeProvider', () => {
  beforeEach(() => {
    authState.value = {
      user: null,
      canAccessParentAssignments: false,
    };
    focusTokenState.value = null;
    lessonAssignmentsHookCallsMock.mockClear();
    lessonTemplateHookCallsMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not hydrate the full lesson template collection on the initial render', async () => {
    render(
      <KangurLessonsRuntimeProvider>
        <div>runtime-ready</div>
      </KangurLessonsRuntimeProvider>
    );

    expect(screen.getByText('runtime-ready')).toBeInTheDocument();
    expect(lessonTemplateHookCallsMock).toHaveBeenCalledWith({
      componentId: null,
      enabled: false,
    });
  });

  it('keeps focused lesson resolution stable without a preloaded template collection', async () => {
    focusTokenState.value = 'english_basics';

    render(
      <KangurLessonsRuntimeProvider>
        <div>runtime-ready</div>
      </KangurLessonsRuntimeProvider>
    );

    await waitFor(() =>
      expect(lessonTemplateHookCallsMock).toHaveBeenCalledWith({
        componentId: null,
        enabled: false,
      })
    );
  });

  it('defers lesson assignments hydration until after the first render turn', async () => {
    vi.useFakeTimers();
    authState.value = {
      user: null,
      canAccessParentAssignments: true,
    };

    render(
      <KangurLessonsRuntimeProvider>
        <div>runtime-ready</div>
      </KangurLessonsRuntimeProvider>
    );

    expect(lessonAssignmentsHookCallsMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(lessonAssignmentsHookCallsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });
});
