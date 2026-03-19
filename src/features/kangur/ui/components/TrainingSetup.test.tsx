/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';

describe('TrainingSetup', () => {
  it('surfaces pressed state for category and question-count selections', () => {
    render(<TrainingSetup onStart={vi.fn()} />);

    const heading = screen.getByTestId('training-setup-heading');
    const shell = screen.getByTestId('training-setup-shell');
    const categoryGroup = screen.getByTestId('training-setup-category-group');
    const countGroup = screen.getByTestId('training-setup-count-group');
    expect(heading).toHaveClass('flex', 'flex-row', 'items-start', 'text-left');
    expect(shell).toHaveClass('glass-panel', 'border-white/88', 'bg-white/94');
    expect(categoryGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(countGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(within(heading).getByRole('heading', { name: 'Dobierz trening' })).toHaveClass(
      'text-xl',
      'sm:text-2xl',
      '[color:var(--kangur-accent-indigo-start,#a855f7)]'
    );
    expect(screen.queryByRole('heading', { name: 'Wybierz poziom trudności' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Poziom trudności' })).toBeInTheDocument();

    const additionButton = screen.getByRole('button', { name: 'categories.addition' });
    const tenQuestionsButton = screen.getByRole('button', { name: '10 pytań' });
    const twentyQuestionsButton = screen.getByRole('button', { name: '20 pytań' });
    expect(additionButton).toHaveAttribute('aria-pressed', 'true');
    expect(additionButton).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(tenQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(tenQuestionsButton).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'false');
    expect(twentyQuestionsButton).toHaveClass('kangur-segmented-control-item', 'rounded-[18px]');
    expect(twentyQuestionsButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(screen.getByRole('button', { name: /Start/i })).toHaveClass('kangur-cta-pill', 'primary-cta');

    fireEvent.click(additionButton);
    fireEvent.click(twentyQuestionsButton);

    expect(additionButton).toHaveAttribute('aria-pressed', 'false');
    expect(additionButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(twentyQuestionsButton).toHaveClass('kangur-segmented-control-item-active');
  });

  it('applies the suggested training preset and shows the recommendation card', () => {
    render(
      <TrainingSetup
        onStart={vi.fn()}
        suggestedSelection={{
          categories: ['division'],
          count: 15,
          difficulty: 'hard',
        }}
        suggestionDescription='To najmocniej podbije dzisiejszy postęp.'
        suggestionLabel='Mocna passa'
        suggestionTitle='Polecany trening: Dzielenie'
      />
    );

    expect(screen.getByTestId('training-setup-suggestion-card')).toBeInTheDocument();
    expect(screen.getByTestId('training-setup-suggestion-label')).toHaveTextContent('Mocna passa');
    expect(screen.getByTestId('training-setup-suggestion-title')).toHaveTextContent(
      'Polecany trening: Dzielenie'
    );
    expect(screen.getByTestId('training-setup-suggestion-description')).toHaveTextContent(
      'To najmocniej podbije dzisiejszy postęp.'
    );
    expect(screen.getByRole('button', { name: 'categories.division' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'categories.addition' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '15 pytań' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Poziom trudności' })).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-option-hard')).toHaveAttribute('aria-pressed', 'true');
  });
});
