/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/test-utils';
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
        color: 'kangur-gradient-accent-amber',
        contentMode: 'component',
      },
      activeLessonAssignment: {
        id: 'assignment-1',
        title: 'Powtórz dodawanie',
        description: 'Skup się na prostych sumach.',
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
          summary: 'Powtórki: 0/1',
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
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong'
    );
    expect(headerActions).toContainElement(
      screen.getByTestId('active-lesson-widget-icon-adding-lesson')
    );
    expect(headerActions).toContainElement(screen.getByTestId('kangur-lesson-narrator'));
    expect(screen.getByTestId('active-lesson-widget-parent-priority-chip')).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('active-lesson-widget-parent-priority-chip')).toHaveTextContent(
      'Priorytet rodzica'
    );
    expect(screen.queryByText('Powtórz dodawanie')).toBeNull();
    expect(screen.queryByText('Skup się na prostych sumach.')).toBeNull();
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
        color: 'kangur-gradient-accent-amber',
        contentMode: 'component',
      },
      activeLessonAssignment: null,
      completedActiveLessonAssignment: {
        id: 'assignment-2',
        title: 'Powtórz dodawanie',
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
          summary: 'Powtórki: 1/1',
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
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('active-lesson-widget-parent-completed-chip')).toHaveTextContent(
      'Ukonczone dla rodzica'
    );
    expect(screen.queryByText('Powtórz dodawanie')).toBeNull();
    expect(screen.queryByText('Zakonczone.')).toBeNull();
  });

  it('routes the shared header back button through the lesson runtime action', () => {
    lessonsRuntimeState.value = {
      activeLesson: {
        id: 'adding-lesson',
        title: 'Dodawanie',
        description: 'Nauka dodawania krok po kroku',
        emoji: '➕',
        color: 'kangur-gradient-accent-amber',
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
