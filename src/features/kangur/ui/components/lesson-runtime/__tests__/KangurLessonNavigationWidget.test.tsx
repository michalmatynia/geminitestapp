/**
 * @vitest-environment jsdom
 */
'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

const { useOptionalKangurLessonsRuntimeMock } = vi.hoisted(() => ({
  useOptionalKangurLessonsRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useOptionalKangurLessonsRuntime: useOptionalKangurLessonsRuntimeMock,
}));
vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurLessonNavigationWidget } from '../KangurLessonNavigationWidget';
import {
  KangurLessonNavigationProvider,
  useKangurRegisterLessonSubsectionNavigation,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

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
    useOptionalKangurLessonsRuntimeMock.mockReturnValue({
      prevLesson: null,
      nextLesson: {
        id: 'lesson-calendar',
        emoji: '📅',
        title: 'Nauka kalendarza',
      },
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
      ...splitClasses(LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME)
    );
    expect(screen.getByRole('group', { name: /nawigacja/i })).toHaveClass(
      ...splitClasses(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME)
    );
    expect(screen.getByRole('button', { name: /Poprzednia lekcja/i })).toHaveClass(
      'touch-manipulation',
      '[@media(pointer:coarse)]:min-h-11'
    );
    expect(screen.getByRole('button', { name: /Następna lekcja/i })).toHaveClass(
      'touch-manipulation',
      '[@media(pointer:coarse)]:min-h-11'
    );
  });

  it('keeps previous and next lesson controls icon-only', () => {
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

    expect(screen.getByRole('button', { name: /Poprzednia lekcja/i })).not.toHaveTextContent(
      'Poprzednia'
    );
    expect(screen.getByRole('button', { name: /Następna lekcja/i })).not.toHaveTextContent(
      'Następna'
    );
    expect(screen.queryByText(/^Poprzednia$/)).toBeNull();
    expect(screen.queryByText(/^Następna$/)).toBeNull();
  });

  it('renders only previous and next lesson controls in the outer lesson navigation', () => {
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

    expect(screen.getByRole('button', { name: /Poprzednia lekcja/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Następna lekcja/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Drukuj panel/i })).toBeNull();
  });
});
