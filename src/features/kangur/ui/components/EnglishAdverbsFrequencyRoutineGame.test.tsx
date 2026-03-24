/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 14,
  breakdown: [{ label: 'Frequency studio', xp: 14 }],
  progressUpdates: {},
}));
const loadProgressMock = vi.fn(() => ({}));
const persistKangurSessionScoreMock = vi.fn();
let draggableSnapshot = { isDragging: false };

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

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
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        draggableProps: { style?: React.CSSProperties };
        dragHandleProps: Record<string, never>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {},
      },
      draggableSnapshot
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]) => addXpMock(...args),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    loadProgress: () => loadProgressMock(),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.data', () => ({
  ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS: [
    {
      id: 'cinema-sunday',
      accent: 'amber',
      actions: [
        { id: 'cinema-sunday-cinema', actionId: 'go_to_cinema', answer: 'always' },
        { id: 'cinema-sunday-friends', actionId: 'go_with_friends', answer: 'usually' },
        { id: 'cinema-sunday-popcorn', actionId: 'eat_popcorn', answer: 'never' },
      ],
    },
    {
      id: 'weekend-club',
      accent: 'violet',
      actions: [
        { id: 'weekend-club-park', actionId: 'go_to_park', answer: 'always' },
        { id: 'weekend-club-tv', actionId: 'watch_tv', answer: 'sometimes' },
        { id: 'weekend-club-swimming', actionId: 'go_swimming', answer: 'never' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdverbsFrequencyRoutineGame from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishAdverbsFrequencyRoutineGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const placeFrequency = (
  frequency: 'always' | 'usually' | 'sometimes' | 'never',
  slotId: string
): void => {
  fireEvent.click(screen.getByRole('button', { name: frequency }));
  fireEvent.click(screen.getByTestId(`english-adverbs-frequency-slot-${slotId}`));
};

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishAdverbsFrequencyRoutineGame', () => {
  it('plays through the rounds and shows the summary after a correct weekly planner build', () => {
    renderGame();

    expect(screen.getByText('Cinema Sunday')).toBeInTheDocument();
    expect(screen.getByText('Frequency bank')).toBeInTheDocument();
    expect(screen.getByText('Routine planner')).toBeInTheDocument();

    placeFrequency('always', 'cinema-sunday-cinema');
    placeFrequency('usually', 'cinema-sunday-friends');
    placeFrequency('never', 'cinema-sunday-popcorn');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Perfect! The planner matches the target routine.')
    ).toBeInTheDocument();
    expect(screen.getByText('3/3 correct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Weekend club')).toBeInTheDocument();

    placeFrequency('always', 'weekend-club-park');
    placeFrequency('sometimes', 'weekend-club-tv');
    placeFrequency('never', 'weekend-club-swimming');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-adverbs-frequency-summary-title')).toHaveTextContent(
      'Score: 6/6'
    );
    expect(
      screen.getByText('Perfect! The weekly routine matches every frequency word.')
    ).toBeInTheDocument();
    expect(addXpMock).toHaveBeenCalledWith(14, {});
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 6,
        operation: 'english_adverbs_frequency',
        score: 6,
        totalQuestions: 6,
      })
    );
  });

  it('shows retry feedback when a routine lane gets the wrong frequency card', () => {
    renderGame();

    placeFrequency('never', 'cinema-sunday-cinema');
    placeFrequency('always', 'cinema-sunday-friends');
    placeFrequency('usually', 'cinema-sunday-popcorn');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Try again and compare how many days each action should happen.')
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 correct')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('english-adverbs-frequency-slot-cinema-sunday-cinema')).getByRole(
        'button',
        { name: 'never' }
      )
    ).toBeInTheDocument();
  });

  it('renders the active dragged frequency card in a body portal during dragging', () => {
    draggableSnapshot = { isDragging: true };

    renderGame();

    const pool = screen.getByTestId('english-adverbs-frequency-pool-zone');

    expect(within(pool).queryByRole('button', { name: 'always' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'always' })).toBeInTheDocument();
  });
});
