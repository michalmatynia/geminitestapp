/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurTestQuestionRenderer } from '@/features/kangur/ui/components/KangurTestQuestionRenderer';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';

const question: KangurTestQuestion = {
  id: 'question-1',
  suiteId: 'suite-1',
  sortOrder: 1000,
  prompt: 'Ile to jest 2 + 2?',
  choices: [
    { label: 'A', text: '4' },
    { label: 'B', text: '5' },
  ],
  correctChoiceLabel: 'A',
  pointValue: 3,
  explanation: '2 + 2 = 4.',
  illustration: { type: 'none' },
};

describe('KangurTestQuestionRenderer', () => {
  it('uses Kangur option-card styling for answer choices and shared feedback surfaces', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel={null}
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={false}
        totalQuestions={1}
      />
    );

    expect(await screen.findByRole('button', { name: /read question/i })).toBeInTheDocument();
    const correctChoiceButton = screen.getByRole('button', { name: /A.*4/i });
    const wrongChoiceButton = screen.getByRole('button', { name: /B.*5/i });

    expect(correctChoiceButton).toHaveClass('soft-card', 'rounded-[24px]', 'cursor-pointer');
    expect(wrongChoiceButton).toHaveClass('soft-card', 'rounded-[24px]', 'cursor-pointer');

    fireEvent.click(correctChoiceButton);
    expect(onSelect).toHaveBeenCalledWith('A');

    rerender(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel='A'
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={false}
        totalQuestions={1}
      />
    );

    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass('border-amber-300');

    rerender(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel='A'
        onSelect={onSelect}
        questionIndex={0}
        showAnswer={true}
        totalQuestions={1}
      />
    );

    expect(screen.getByText('3 pts')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(screen.getByText('Question 1 / 1')).toHaveClass('text-slate-400');
    expect(screen.getByText('Ile to jest 2 + 2?')).toHaveClass('text-slate-800');
    expect(screen.getByText('Explanation').parentElement).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
    expect(screen.getByText(/Correct! \+3 pts/i).closest('div')).toHaveClass(
      'soft-card',
      'border-emerald-300'
    );
    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass('border-emerald-300');
  });
});
