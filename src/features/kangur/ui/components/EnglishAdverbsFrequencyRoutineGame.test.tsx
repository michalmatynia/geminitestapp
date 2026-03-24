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
    loadProgress: (...args: unknown[]) => loadProgressMock(...args),
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

const getActiveDayCount = (weekTestIdPrefix: string): number =>
  Array.from({ length: 7 }, (_, index) =>
    screen.getByTestId(`${weekTestIdPrefix}-day-${index}`).getAttribute('data-active')
  ).filter((value) => value === 'true').length;

const getChangedDayCount = (weekTestIdPrefix: string): number =>
  Array.from({ length: 7 }, (_, index) =>
    screen.getByTestId(`${weekTestIdPrefix}-day-${index}`).getAttribute('data-changed')
  ).filter((value) => value === 'true').length;

afterEach(() => {
  draggableSnapshot = { isDragging: false };
});

const getTokenActiveDotCount = (button: HTMLElement): number =>
  button.querySelectorAll('[data-active="true"]').length;

describe('EnglishAdverbsFrequencyRoutineGame', () => {
  it('plays through the rounds and shows the summary after a correct weekly planner build', () => {
    renderGame();

    expect(screen.getByText('Cinema Sunday')).toBeInTheDocument();
    expect(screen.getByText('Frequency bank')).toBeInTheDocument();
    expect(screen.getByText('Routine planner')).toBeInTheDocument();
    const alwaysToken = screen.getByRole('button', { name: 'always' });
    expect(within(alwaysToken).getByText('Days lit: 7/7')).toBeInTheDocument();
    expect(getTokenActiveDotCount(alwaysToken)).toBe(7);
    expect(
      screen.getByTestId('english-adverbs-frequency-target-cinema-sunday-cinema')
    ).toHaveTextContent('I always go to the cinema.');
    expect(
      screen.getByTestId('english-adverbs-frequency-target-cinema-sunday-cinema')
    ).toHaveTextContent('Word order: adverb before the main verb');
    expect(
      screen.getByTestId('english-adverbs-frequency-target-cinema-sunday-cinema')
    ).toHaveTextContent('Days lit: 7/7');
    expect(getActiveDayCount('english-adverbs-frequency-target-week-cinema-sunday-cinema')).toBe(7);
    expect(getActiveDayCount('english-adverbs-frequency-target-week-cinema-sunday-friends')).toBe(6);
    expect(getActiveDayCount('english-adverbs-frequency-target-week-cinema-sunday-popcorn')).toBe(0);

    placeFrequency('always', 'cinema-sunday-cinema');
    placeFrequency('usually', 'cinema-sunday-friends');
    placeFrequency('never', 'cinema-sunday-popcorn');

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(
      screen.getByText('Perfect! The planner matches the target routine.')
    ).toBeInTheDocument();
    expect(screen.getByText('3/3 correct')).toBeInTheDocument();
    expect(
      screen.getByTestId('english-adverbs-frequency-match-cinema-sunday-cinema')
    ).toHaveTextContent('Matched');
    expect(
      screen.getByTestId('english-adverbs-frequency-match-cinema-sunday-cinema')
    ).toHaveTextContent('I always go to the cinema.');
    expect(
      screen.getByTestId('english-adverbs-frequency-match-cinema-sunday-cinema')
    ).toHaveTextContent('Days lit: 7/7');

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
    expect(screen.getByTestId('english-adverbs-frequency-summary-badges')).toHaveTextContent(
      'Rounds 2/2'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-badges')).toHaveTextContent(
      'Patterns 6/6'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-badges')).toHaveTextContent(
      'Studio 2/2'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-guide')).toHaveTextContent(
      'Frequency guide'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-guide')).toHaveTextContent(
      'Read each word as a weekly pattern.'
    );
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-guide-always')
    ).toHaveTextContent('always');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-guide-always')
    ).toHaveTextContent('every day or every time');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-guide-always')
    ).toHaveTextContent('Days lit: 7/7');
    expect(getActiveDayCount('english-adverbs-frequency-summary-guide-always')).toBe(7);
    expect(getActiveDayCount('english-adverbs-frequency-summary-guide-usually')).toBe(6);
    expect(getActiveDayCount('english-adverbs-frequency-summary-guide-sometimes')).toBe(3);
    expect(getActiveDayCount('english-adverbs-frequency-summary-guide-never')).toBe(0);
    expect(screen.getByTestId('english-adverbs-frequency-summary-rules')).toHaveTextContent(
      'Word order guide'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-rules')).toHaveTextContent(
      'Keep these two sentence frames in mind.'
    );
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-main-verb')
    ).toHaveTextContent('Before the main verb');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-main-verb')
    ).toHaveTextContent('I always do my homework.');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-main-verb')
    ).toHaveTextContent('Word order: adverb before the main verb');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-be-verb')
    ).toHaveTextContent('After am/is/are');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-be-verb')
    ).toHaveTextContent('I am never late for school.');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-rule-be-verb')
    ).toHaveTextContent('Word order: adverb after am/is/are');
    expect(screen.getByTestId('english-adverbs-frequency-summary-starters')).toHaveTextContent(
      'Say it about your week'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-starters')).toHaveTextContent(
      'Use one of these frames to make your own sentence.'
    );
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-starter-always')
    ).toHaveTextContent('I always do my homework after school.');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-starter-sometimes')
    ).toHaveTextContent('I sometimes go to the park with my friends.');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-starter-never')
    ).toHaveTextContent('I am never late for school.');
    expect(screen.getByTestId('english-adverbs-frequency-summary-questions')).toHaveTextContent(
      'How often...?'
    );
    expect(screen.getByTestId('english-adverbs-frequency-summary-questions')).toHaveTextContent(
      'Pick one question and answer it with a frequency word.'
    );
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-homework')
    ).toHaveTextContent('How often do you do your homework?');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-homework')
    ).toHaveTextContent('Try: I always...');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-park')
    ).toHaveTextContent('How often do you go to the park?');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-park')
    ).toHaveTextContent('Try: I sometimes...');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-late')
    ).toHaveTextContent('How often are you late for school?');
    expect(
      screen.getByTestId('english-adverbs-frequency-summary-question-late')
    ).toHaveTextContent('Try: I am never...');
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: null });
    expect(addXpMock).toHaveBeenCalledWith(14, {}, { ownerKey: null });
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
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Target frequency');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Your sentence');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('I never go to the cinema.');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Your frequency: never');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Target frequency');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('always');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Days lit: 0/7 → 7/7');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Your week');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Target week');
    expect(
      getActiveDayCount('english-adverbs-frequency-correction-current-week-cinema-sunday-cinema')
    ).toBe(0);
    expect(
      getActiveDayCount('english-adverbs-frequency-correction-target-week-cinema-sunday-cinema')
    ).toBe(7);
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Change days: 7/7');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Turn on: 7');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Turn off: 0');
    expect(
      getChangedDayCount('english-adverbs-frequency-correction-current-week-cinema-sunday-cinema')
    ).toBe(7);
    expect(
      getChangedDayCount('english-adverbs-frequency-correction-target-week-cinema-sunday-cinema')
    ).toBe(7);
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('Target sentence');
    expect(
      screen.getByTestId('english-adverbs-frequency-correction-cinema-sunday-cinema')
    ).toHaveTextContent('I always go to the cinema.');
  });

  it('animates the action across the correct number of active days for each frequency', () => {
    renderGame();

    placeFrequency('always', 'cinema-sunday-cinema');
    placeFrequency('usually', 'cinema-sunday-friends');
    placeFrequency('never', 'cinema-sunday-popcorn');

    expect(getActiveDayCount('english-adverbs-frequency-week-cinema-sunday-cinema')).toBe(7);
    expect(getActiveDayCount('english-adverbs-frequency-week-cinema-sunday-friends')).toBe(6);
    expect(getActiveDayCount('english-adverbs-frequency-week-cinema-sunday-popcorn')).toBe(0);
  });

  it('builds a live sentence preview for each assigned frequency card', () => {
    renderGame();

    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('I ___ go to the cinema.');
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('I');
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('___');
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('go to the cinema');
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('Choose a frequency card to build the sentence.');

    placeFrequency('always', 'cinema-sunday-cinema');
    placeFrequency('never', 'cinema-sunday-popcorn');

    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('I always go to the cinema.');
    expect(
      within(screen.getByTestId('english-adverbs-frequency-slot-cinema-sunday-cinema')).getAllByText(
        'Days lit: 7/7'
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-cinema')
    ).toHaveTextContent('Word order: adverb before the main verb');
    expect(
      screen.getByTestId('english-adverbs-frequency-sentence-cinema-sunday-popcorn')
    ).toHaveTextContent('I never eat popcorn there.');
    expect(
      within(screen.getByTestId('english-adverbs-frequency-slot-cinema-sunday-popcorn')).getAllByText(
        'Days lit: 0/7'
      ).length
    ).toBeGreaterThan(0);
  });

  it('renders the active dragged frequency card in a body portal during dragging', () => {
    draggableSnapshot = { isDragging: true };

    renderGame();

    const pool = screen.getByTestId('english-adverbs-frequency-pool-zone');

    expect(within(pool).queryByRole('button', { name: 'always' })).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'always' })).toBeInTheDocument();
  });
});
