/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { addXpMock, createLessonPracticeRewardMock } = vi.hoisted(() => ({
  addXpMock: vi.fn(),
  createLessonPracticeRewardMock: vi.fn(() => ({
    xp: 25,
    scorePercent: 100,
    progressUpdates: {},
  })),
}));

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({
    children,
  }: {
    children: (provided: {
      innerRef: (element: HTMLElement | null) => void;
      droppableProps: Record<string, never>;
      placeholder: null;
    }, snapshot: { isDraggingOver: boolean }) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({
    children,
  }: {
    children: (provided: {
      innerRef: (element: HTMLElement | null) => void;
      draggableProps: Record<string, never>;
      dragHandleProps: Record<string, never>;
    }) => React.ReactNode;
  }) =>
    children({
      innerRef: () => undefined,
      draggableProps: {},
      dragHandleProps: {},
    }),
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  loadProgress: () => ({
    totalXp: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    lessonsCompleted: 0,
    clockPerfect: 0,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: [],
    operationsPlayed: [],
    lessonMastery: {},
  }),
  createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
  addXp: (...args: unknown[]) => addXpMock(...args),
}));

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';

describe('AddingBallGame', () => {
  it('renders the opening drag/drop zones with Kangur card styling', () => {
    render(<AddingBallGame onFinish={() => undefined} />);

    expect(screen.getByTestId('adding-ball-slotA')).toHaveClass('soft-card');
    expect(screen.getByTestId('adding-ball-slotB')).toHaveClass('soft-card');
    expect(screen.getByTestId('adding-ball-slotA')).toHaveClass('border-slate-200/80');
    expect(screen.getByTestId('adding-ball-slotB')).toHaveClass('border-slate-200/80');
    expect(screen.getByTestId('adding-ball-pool')).toHaveClass('soft-card');
    expect(screen.getByRole('button', { name: /sprawdź/i })).toHaveClass(
      'kangur-cta-pill',
      'play-cta'
    );
  });
});
