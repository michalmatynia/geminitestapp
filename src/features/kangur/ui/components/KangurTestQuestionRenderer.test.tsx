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
  it('uses Kangur option-card styling for answer choices across states', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel={null}
        onSelect={onSelect}
        showAnswer={false}
      />
    );

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
        showAnswer={false}
      />
    );

    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass('border-amber-300');

    rerender(
      <KangurTestQuestionRenderer
        question={question}
        selectedLabel='A'
        onSelect={onSelect}
        showAnswer={true}
      />
    );

    expect(screen.getByRole('button', { name: /A.*4/i })).toHaveClass('border-emerald-300');
  });
});
