/**
 * @vitest-environment jsdom
 */

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/__tests__/test-utils';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';

const suite: KangurTestSuite = {
  id: 'suite-2024',
  title: 'Kangur 2024',
  description: 'Zestaw probny',
  year: 2024,
  gradeLevel: 'III-IV',
  category: 'matematyczny',
  enabled: true,
  sortOrder: 1000,
};

const questions: KangurTestQuestion[] = [
  {
    id: 'question-1',
    suiteId: 'suite-2024',
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
  },
];

describe('KangurTestSuitePlayer', () => {
  it('uses the shared pill CTA styles for suite navigation and restart actions', async () => {
    const onFinish = vi.fn();
    render(<KangurTestSuitePlayer suite={suite} questions={questions} onFinish={onFinish} />);

    expect(screen.getByText('Question 1 / 1')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-test-suite-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByRole('button', { name: /previous/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /A.*4/i }));

    const finishButton = screen.getByRole('button', { name: /finish/i });
    expect(finishButton).toHaveClass('kangur-cta-pill', 'play-cta');

    await userEvent.click(finishButton);

    const restartButton = screen.getByRole('button', { name: /try again/i });
    expect(screen.getByTestId('kangur-test-suite-summary')).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
    expect(restartButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(onFinish).toHaveBeenCalledWith(3, 3, { 'question-1': 'A' });
  });

  it('uses the shared empty-state surface when a suite has no questions', () => {
    render(<KangurTestSuitePlayer suite={suite} questions={[]} />);

    expect(screen.getByTestId('kangur-test-suite-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
  });
});
