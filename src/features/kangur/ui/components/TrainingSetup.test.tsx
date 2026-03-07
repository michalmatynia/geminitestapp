/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';

describe('TrainingSetup', () => {
  it('surfaces pressed state for category and question-count selections', () => {
    render(<TrainingSetup onBack={vi.fn()} onStart={vi.fn()} />);

    const heading = screen.getByTestId('training-setup-heading');
    const shell = screen.getByTestId('training-setup-shell');
    const categoryGroup = screen.getByTestId('training-setup-category-group');
    const countGroup = screen.getByTestId('training-setup-count-group');
    expect(heading).toHaveClass('flex', 'flex-row', 'items-start', 'text-left');
    expect(shell).toHaveClass('glass-panel', 'border-white/88', 'bg-white/94');
    expect(categoryGroup).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(countGroup).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(within(heading).getByRole('heading', { name: 'Tryb treningowy' })).toHaveClass(
      'text-2xl',
      'text-indigo-700'
    );

    const additionButton = screen.getByRole('button', { name: 'Dodawanie' });
    const tenQuestionsButton = screen.getByRole('button', { name: '10 pytan' });
    const twentyQuestionsButton = screen.getByRole('button', { name: '20 pytan' });
    const backButton = screen.getByRole('button', { name: /Wroc/i });

    expect(additionButton).toHaveAttribute('aria-pressed', 'true');
    expect(additionButton).toHaveClass('rounded-[18px]', 'text-indigo-700', 'ring-1');
    expect(tenQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(tenQuestionsButton).toHaveClass('rounded-[18px]', 'text-indigo-700', 'ring-1');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'false');
    expect(twentyQuestionsButton).toHaveClass('rounded-[18px]', 'text-slate-500');
    expect(backButton).toHaveClass('kangur-cta-pill', 'surface-cta');

    fireEvent.click(additionButton);
    fireEvent.click(twentyQuestionsButton);

    expect(additionButton).toHaveAttribute('aria-pressed', 'false');
    expect(additionButton).toHaveClass('text-slate-500');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(twentyQuestionsButton).toHaveClass('text-indigo-700', 'ring-1');
  });
});
