/**
 * @vitest-environment jsdom
 */


"use client";

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  useKangurLessonsRuntimeStateMock,
  useKangurLessonsRuntimeActionsMock,
  useOptionalKangurLessonsRuntimeMock,
} = vi.hoisted(() => ({
  useKangurLessonsRuntimeStateMock: vi.fn(),
  useKangurLessonsRuntimeActionsMock: vi.fn(),
  useOptionalKangurLessonsRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useKangurLessonsRuntimeState: useKangurLessonsRuntimeStateMock,
  useKangurLessonsRuntimeActions: useKangurLessonsRuntimeActionsMock,
  useOptionalKangurLessonsRuntime: useOptionalKangurLessonsRuntimeMock,
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
});
