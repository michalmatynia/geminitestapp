/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import type { KangurQuestion } from '@/features/kangur/ui/types';

import QuestionCard from '@/features/kangur/ui/components/QuestionCard';

const sampleQuestion: KangurQuestion = {
  question: '6 + 1',
  choices: [7, 8, 9, 10],
  answer: 7,
};

describe('QuestionCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses Kangur option-card styling for answer tiles and marks result states', async () => {
    const onAnswer = vi.fn();

    render(
      <QuestionCard
        question={sampleQuestion}
        onAnswer={onAnswer}
        questionNumber={1}
        total={10}
        timeLimit={30}
      />
    );

    const correctChoice = screen.getByTestId('question-card-choice-7');
    const wrongChoice = screen.getByTestId('question-card-choice-8');

    expect(screen.getByTestId('question-card-timer-bar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('question-card-timer-bar')).toHaveAttribute(
      'aria-valuetext',
      '30 sekund pozostało'
    );
    expect(screen.getByTestId('question-card-shell')).toHaveClass('glass-panel', 'kangur-panel-soft');
    expect(screen.getByRole('group', { name: '6 + 1' })).toBeInTheDocument();
    expect(correctChoice).toHaveClass(
      'soft-card',
      'border',
      'kangur-card-surface',
      'kangur-card-padding-md',
      'min-h-[4.25rem]',
      'touch-manipulation'
    );
    expect(wrongChoice).toHaveClass(
      'soft-card',
      'border',
      'kangur-card-surface',
      'kangur-card-padding-md',
      'min-h-[4.25rem]',
      'touch-manipulation'
    );

    fireEvent.click(wrongChoice);

    expect(correctChoice).toHaveAttribute('aria-disabled', 'true');
    expect(wrongChoice).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('❌ Odpowiedź to 7');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('exposes a text alternative for clock questions', () => {
    render(
      <QuestionCard
        question={{
          question: 'CLOCK:3:15',
          choices: ['3:15', '3:30', '4:15', '4:30'],
          answer: '3:15',
        }}
        onAnswer={vi.fn()}
        questionNumber={2}
        total={10}
        timeLimit={20}
      />
    );

    expect(
      screen.getByRole('img', { name: 'Zegar analogowy pokazuje godzinę 3:15.' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Którą godzinę pokazuje zegar?' })).toBeInTheDocument();
  });
});
