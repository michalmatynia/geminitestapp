/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';

describe('KangurAnswerChoiceCard', () => {
  it('renders the shared answer-choice styling and keeps choices interactive by default', () => {
    const handleClick = vi.fn();

    render(
      <KangurAnswerChoiceCard
        accent='amber'
        data-testid='answer-choice'
        onClick={handleClick}
      >
        12
      </KangurAnswerChoiceCard>
    );

    const choice = screen.getByTestId('answer-choice');
    expect(choice).toHaveClass(
      'kangur-card-surface',
      'kangur-card-padding-md',
      'transition-all',
      'cursor-pointer'
    );

    fireEvent.click(choice);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('switches to the shared non-interactive cursor state when a choice is locked', () => {
    render(
      <KangurAnswerChoiceCard
        accent='slate'
        data-testid='answer-choice'
        interactive={false}
      >
        Locked
      </KangurAnswerChoiceCard>
    );

    expect(screen.getByTestId('answer-choice')).toHaveClass('cursor-default');
  });
});
