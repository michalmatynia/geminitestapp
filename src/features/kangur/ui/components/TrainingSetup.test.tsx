/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';

describe('TrainingSetup', () => {
  it('surfaces pressed state for category and question-count selections', () => {
    render(<TrainingSetup onBack={vi.fn()} onStart={vi.fn()} />);

    const additionButton = screen.getByRole('button', { name: 'Dodawanie' });
    const tenQuestionsButton = screen.getByRole('button', { name: '10 pytan' });
    const twentyQuestionsButton = screen.getByRole('button', { name: '20 pytan' });

    expect(additionButton).toHaveAttribute('aria-pressed', 'true');
    expect(tenQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(additionButton);
    fireEvent.click(twentyQuestionsButton);

    expect(additionButton).toHaveAttribute('aria-pressed', 'false');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'true');
  });
});
