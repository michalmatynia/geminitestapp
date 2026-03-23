/**
 * @vitest-environment jsdom
 */
'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  useKangurLessonsRuntimeStateMock,
  useKangurLessonsRuntimeActionsMock,
  useOptionalKangurLessonsRuntimeMock,
  ageGroupState,
} = vi.hoisted(() => ({
  useKangurLessonsRuntimeStateMock: vi.fn(),
  useKangurLessonsRuntimeActionsMock: vi.fn(),
  useOptionalKangurLessonsRuntimeMock: vi.fn(),
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useKangurLessonsRuntimeState: useKangurLessonsRuntimeStateMock,
  useKangurLessonsRuntimeActions: useKangurLessonsRuntimeActionsMock,
  useOptionalKangurLessonsRuntime: useOptionalKangurLessonsRuntimeMock,
}));
vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: ageGroupState.value,
    setAgeGroup: vi.fn(),
  }),
}));

import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import {
  KangurLessonNavigationProvider,
  useKangurRegisterLessonSubsectionNavigation,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const SubsectionNavigationMarker = (): React.JSX.Element => {
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();

  React.useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  return <div data-testid='subsection-navigation-marker' />;
};

describe('KangurLessonNavigationWidget', () => {
  it('hides lesson-to-lesson navigation while a subsection panel flow is active', () => {
    ageGroupState.value = 'ten_year_old';
    useOptionalKangurLessonsRuntimeMock.mockReturnValue(null);
    useKangurLessonsRuntimeStateMock.mockReturnValue({
      prevLesson: null,
      nextLesson: {
        id: 'lesson-calendar',
        emoji: '📅',
        title: 'Nauka kalendarza',
      },
    });
    useKangurLessonsRuntimeActionsMock.mockReturnValue({
      selectLesson: vi.fn(),
    });

    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <SubsectionNavigationMarker />
        <KangurLessonNavigationWidget />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('subsection-navigation-marker')).toBeInTheDocument();
    expect(screen.queryByText('📅 Nauka kalendarza')).not.toBeInTheDocument();
  });

  it('widens previous and next lesson buttons on coarse pointers', () => {
    ageGroupState.value = 'ten_year_old';
    const selectLesson = vi.fn();
    useOptionalKangurLessonsRuntimeMock.mockReturnValue({
      prevLesson: {
        id: 'lesson-adding',
        emoji: '➕',
        title: 'Dodawanie',
      },
      nextLesson: {
        id: 'lesson-calendar',
        emoji: '📅',
        title: 'Kalendarz',
      },
      selectLesson,
    });

    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <KangurLessonNavigationWidget />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByRole('navigation', { name: /nawigacja/i })).toHaveClass(
      'w-full',
      'gap-2',
      'items-center'
    );
    expect(screen.getByRole('button', { name: /Poprzednia lekcja/i })).toHaveClass(
      'min-h-11',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: /Następna lekcja/i })).toHaveClass(
      'min-h-11',
      'touch-manipulation'
    );
  });

  it('uses icon-first previous and next cues for six-year-old learners', () => {
    ageGroupState.value = 'six_year_old';
    useOptionalKangurLessonsRuntimeMock.mockReturnValue({
      prevLesson: {
        id: 'lesson-adding',
        emoji: '➕',
        title: 'Dodawanie',
      },
      nextLesson: {
        id: 'lesson-calendar',
        emoji: '📅',
        title: 'Kalendarz',
      },
      selectLesson: vi.fn(),
    });

    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <KangurLessonNavigationWidget />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('kangur-lesson-nav-prev-icon')).toHaveTextContent('🔙');
    expect(screen.getByTestId('kangur-lesson-nav-next-icon')).toHaveTextContent('🔜');
  });
});
