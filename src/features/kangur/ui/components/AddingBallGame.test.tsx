/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

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
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        droppableProps: Record<string, never>;
        placeholder: null;
      },
      snapshot: { isDraggingOver: boolean }
    ) => React.ReactNode;
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
    }, snapshot: { isDragging: boolean }) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    loadProgress: () => createDefaultKangurProgressState(),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    addXp: (...args: unknown[]) => addXpMock(...args),
  };
});

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';

describe('AddingBallGame', () => {
  it('renders the opening drag/drop zones with Kangur card styling', () => {
    render(<AddingBallGame onFinish={() => undefined} />);

    expect(screen.getByTestId('adding-ball-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('adding-ball-slotA')).toHaveClass('soft-card');
    expect(screen.getByTestId('adding-ball-slotB')).toHaveClass('soft-card');
    expect(screen.getByTestId('adding-ball-slotA')).toHaveClass('border');
    expect(screen.getByTestId('adding-ball-slotB')).toHaveClass('border');
    expect(screen.getByTestId('adding-ball-pool')).toHaveClass('soft-card');
    expect(screen.getByText('Przeciągnij piłki tak, żeby uzupełnić równanie:')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByText('1/6')).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('adding-ball-round-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('button', { name: /sprawdź/i })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
  });
});
