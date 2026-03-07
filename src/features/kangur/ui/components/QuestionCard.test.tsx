/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    expect(correctChoice).toHaveClass('soft-card', 'border-slate-200/80');
    expect(wrongChoice).toHaveClass('soft-card', 'border-slate-200/80');

    fireEvent.click(wrongChoice);

    expect(correctChoice).toHaveClass('border-emerald-300');
    expect(wrongChoice).toHaveClass('border-rose-300');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});
