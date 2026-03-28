/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 16,
  breakdown: [{ label: 'Action studio', xp: 16 }],
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
    loadProgress: (...args: unknown[]) => loadProgressMock(...args),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/EnglishAdverbsActionStudioGame.data', () => ({
  ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS: [
    {
      id: 'race-day',
      accent: 'sky',
      tokens: ['fast', 'carefully', 'beautifully', 'happily', 'badly'],
      actions: [
        { id: 'race-day-run', actionId: 'run_race', answer: 'fast' },
        { id: 'race-day-paint', actionId: 'paint_picture', answer: 'beautifully' },
        { id: 'race-day-carry', actionId: 'carry_books', answer: 'carefully' },
      ],
    },
    {
      id: 'school-studio',
      accent: 'amber',
      tokens: ['well', 'happily', 'badly', 'fast', 'carefully'],
      actions: [
        { id: 'school-studio-football', actionId: 'play_football', answer: 'well' },
        { id: 'school-studio-dance', actionId: 'dance_show', answer: 'happily' },
        { id: 'school-studio-write', actionId: 'write_story', answer: 'badly' },
      ],
    },
  ],
}));

import enMessages from '@/i18n/messages/en.json';
import EnglishAdverbsActionStudioGame from '@/features/kangur/ui/components/EnglishAdverbsActionStudioGame';

const renderGame = () =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <EnglishAdverbsActionStudioGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const placeAdverb = (
  adverb: 'fast' | 'carefully' | 'beautifully' | 'happily' | 'well' | 'badly',
  slotId: string
): void => {
  fireEvent.click(screen.getByRole('button', { name: adverb }));
  fireEvent.click(screen.getByTestId(`english-adverbs-slot-${slotId}`));
};

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

describe('EnglishAdverbsActionStudioGame', () => {
  it('plays through the rounds and shows the summary after a correct action studio build', () => {
    renderGame();

    expect(screen.getByText('Race day')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-pool-zone')).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-selection-hint')).toHaveTextContent(
      'Tap an adverb card, then tap an action lane or the bank.'
    );
    expect(
      screen.getByTestId('english-adverbs-target-strip-race-day-run-clip')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-target-strip-race-day-run-atmosphere')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-target-strip-race-day-run-frame')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-target-race-day-run')
    ).toHaveTextContent('He runs fast.');

    placeAdverb('fast', 'race-day-run');
    placeAdverb('beautifully', 'race-day-paint');
    placeAdverb('carefully', 'race-day-carry');

    expect(screen.getByTestId('english-adverbs-sentence-race-day-run')).toHaveTextContent(
      'He runs fast.'
    );
    expect(
      screen.getByTestId('english-adverbs-strip-race-day-run-speed-lines')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-strip-race-day-paint-beauty-sparkles')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-strip-race-day-carry-care-guides')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Perfect! The action cards match every target scene.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('english-adverbs-match-race-day-run')).toHaveTextContent(
      'Matched'
    );
    expect(screen.getByTestId('english-adverbs-match-race-day-paint')).toHaveTextContent(
      'Matched'
    );
    expect(screen.getByTestId('english-adverbs-match-race-day-carry')).toHaveTextContent(
      'Matched'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('School studio')).toBeInTheDocument();

    placeAdverb('well', 'school-studio-football');
    placeAdverb('happily', 'school-studio-dance');
    placeAdverb('badly', 'school-studio-write');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByTestId('english-adverbs-summary-title')).toHaveTextContent('Score: 6/6');
    expect(screen.getByTestId('english-adverbs-summary-badges')).toHaveTextContent(
      'Rounds 2/2'
    );
    expect(screen.getByTestId('english-adverbs-summary-badges')).toHaveTextContent(
      'Actions 6/6'
    );
    expect(screen.getByTestId('english-adverbs-summary-guide')).toHaveTextContent(
      'Adverb guide'
    );
    expect(screen.getByTestId('english-adverbs-summary-form-guide')).toHaveTextContent(
      'careful → carefully'
    );
    expect(screen.getByTestId('english-adverbs-summary-starters')).toHaveTextContent(
      'I work carefully in class.'
    );
  });

  it('shows a correction card with the target adverb and sentence after a wrong match', () => {
    renderGame();

    placeAdverb('badly', 'race-day-run');
    placeAdverb('beautifully', 'race-day-paint');
    placeAdverb('carefully', 'race-day-carry');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const correction = screen.getByTestId('english-adverbs-correction-race-day-run');
    expect(correction).toHaveTextContent('Your adverb');
    expect(correction).toHaveTextContent('badly');
    expect(correction).toHaveTextContent('Target adverb');
    expect(correction).toHaveTextContent('fast');
    expect(correction).toHaveTextContent('Your sentence');
    expect(correction).toHaveTextContent('He runs badly.');
    expect(correction).toHaveTextContent('Target sentence');
    expect(correction).toHaveTextContent('He runs fast.');
    expect(correction).toHaveTextContent('Style change');
    expect(correction).toHaveTextContent('change the speed');
  });
});
