/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lessonsRuntimeState = {
  value: {
    activeLesson: null,
    activeLessonAssignment: null,
    completedActiveLessonAssignment: null,
    activeLessonDocument: null,
    ActiveLessonComponent: null,
    shouldRenderLessonDocument: false,
    hasActiveLessonDocumentContent: false,
    activeLessonContentRef: { current: null },
  },
};

const clearActiveLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useKangurLessonsRuntimeState: () => lessonsRuntimeState.value,
  useKangurLessonsRuntimeActions: () => ({
    clearActiveLesson: clearActiveLessonMock,
  }),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator'>Czytaj</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => <div data-testid='lesson-document-renderer' />,
}));

import { KangurActiveLessonPanelWidget } from '@/features/kangur/ui/components/KangurActiveLessonPanelWidget';

describe('KangurActiveLessonPanelWidget', () => {
  it('shows the parent assignment state as a compact header pill instead of a large summary panel', () => {
    lessonsRuntimeState.value = {
      activeLesson: {
        id: 'adding-lesson',
        title: 'Dodawanie',
        description: 'Nauka dodawania krok po kroku',
        emoji: '➕',
        color: 'from-orange-400 to-yellow-400',
        contentMode: 'component',
      },
      activeLessonAssignment: {
        id: 'assignment-1',
        title: 'Powtorz dodawanie',
        description: 'Skup sie na prostych sumach.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'adding',
          requiredCompletions: 1,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-08T10:00:00.000Z',
        updatedAt: '2026-03-08T10:00:00.000Z',
        progress: {
          status: 'in_progress',
          percent: 20,
          summary: 'Powtorki: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      },
      completedActiveLessonAssignment: null,
      activeLessonDocument: null,
      ActiveLessonComponent: () => <div data-testid='active-lesson-body'>Lesson body</div>,
      shouldRenderLessonDocument: false,
      hasActiveLessonDocumentContent: false,
      activeLessonContentRef: { current: null },
    };

    render(<KangurActiveLessonPanelWidget />);

    const headerActions = screen.getByTestId('active-lesson-widget-header-icon-actions');

    expect(screen.getByTestId('active-lesson-widget-header')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(headerActions.firstElementChild).toBe(
      screen.getByTestId('active-lesson-widget-icon-adding-lesson')
    );
    expect(headerActions).toContainElement(screen.getByTestId('kangur-lesson-narrator'));
    expect(screen.getByTestId('active-lesson-widget-parent-priority-chip')).toHaveClass(
      'border-rose-200',
      'bg-rose-100'
    );
    expect(screen.getByTestId('active-lesson-widget-parent-priority-chip')).toHaveTextContent(
      'Priorytet Rodzica'
    );
    expect(screen.queryByText('Powtorz dodawanie')).toBeNull();
    expect(screen.queryByText('Skup sie na prostych sumach.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Wroc do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByTestId('active-lesson-body')).toBeInTheDocument();
  });

  it('shows the completed parent-assignment state as a compact header pill', () => {
    lessonsRuntimeState.value = {
      activeLesson: {
        id: 'adding-lesson',
        title: 'Dodawanie',
        description: 'Nauka dodawania krok po kroku',
        emoji: '➕',
        color: 'from-orange-400 to-yellow-400',
        contentMode: 'component',
      },
      activeLessonAssignment: null,
      completedActiveLessonAssignment: {
        id: 'assignment-2',
        title: 'Powtorz dodawanie',
        description: 'Zakonczone.',
        priority: 'medium',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'adding',
          requiredCompletions: 1,
          baselineCompletions: 1,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-08T10:00:00.000Z',
        updatedAt: '2026-03-08T10:00:00.000Z',
        progress: {
          status: 'completed',
          percent: 100,
          summary: 'Powtorki: 1/1',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-08T10:00:00.000Z',
          completedAt: '2026-03-08T10:00:00.000Z',
        },
      },
      activeLessonDocument: null,
      ActiveLessonComponent: () => <div data-testid='active-lesson-body'>Lesson body</div>,
      shouldRenderLessonDocument: false,
      hasActiveLessonDocumentContent: false,
      activeLessonContentRef: { current: null },
    };

    render(<KangurActiveLessonPanelWidget />);

    expect(screen.getByTestId('active-lesson-widget-parent-completed-chip')).toHaveClass(
      'border-emerald-200',
      'bg-emerald-100'
    );
    expect(screen.getByTestId('active-lesson-widget-parent-completed-chip')).toHaveTextContent(
      'Ukonczone dla rodzica'
    );
    expect(screen.queryByText('Powtorz dodawanie')).toBeNull();
    expect(screen.queryByText('Zakonczone.')).toBeNull();
  });

  it('routes the shared header back button through the lesson runtime action', () => {
    lessonsRuntimeState.value = {
      activeLesson: {
        id: 'adding-lesson',
        title: 'Dodawanie',
        description: 'Nauka dodawania krok po kroku',
        emoji: '➕',
        color: 'from-orange-400 to-yellow-400',
        contentMode: 'component',
      },
      activeLessonAssignment: null,
      completedActiveLessonAssignment: null,
      activeLessonDocument: null,
      ActiveLessonComponent: () => <div data-testid='active-lesson-body'>Lesson body</div>,
      shouldRenderLessonDocument: false,
      hasActiveLessonDocumentContent: false,
      activeLessonContentRef: { current: null },
    };

    render(<KangurActiveLessonPanelWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Wroc do listy lekcji' }));

    expect(clearActiveLessonMock).toHaveBeenCalledTimes(1);
  });
});
