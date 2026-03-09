/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { useKangurGameContextMock, getKangurQuestionsMock, useSessionMock } = vi.hoisted(() => ({
  useKangurGameContextMock: vi.fn(),
  getKangurQuestionsMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameContext', () => ({
  useKangurGameContext: useKangurGameContextMock,
}));

vi.mock('@/features/kangur/ui/services/kangur-questions', () => ({
  getKangurQuestions: getKangurQuestionsMock,
}));

vi.mock('next-auth/react', () => ({
  useSession: useSessionMock,
}));

import KangurExam from '@/features/kangur/ui/components/KangurExam';

describe('KangurExam', () => {
  it('uses shared light utility actions and glass summary surfaces', async () => {
    useSessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    useKangurGameContextMock.mockReturnValue({ mode: 'junior' });
    getKangurQuestionsMock.mockReturnValue([
      {
        id: '2024_1',
        question: 'Ile to jest 2 + 2?',
        choices: ['3', '4', '5', '6'],
        answer: '4',
        explanation: '2 + 2 daje 4.',
      },
    ]);

    render(<KangurExam />);

    expect(screen.getByTestId('kangur-exam-question-shell')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('kangur-exam-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('kangur-exam-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      'Pytanie 1 z 1'
    );
    expect(screen.getByTestId('kangur-exam-question-point-chip')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(await screen.findByRole('button', { name: /czytaj pytanie/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pytanie 1' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-exam-question-illustration')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByRole('button', { name: /poprzednie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /zakończ test/i })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );

    await userEvent.click(screen.getByRole('button', { name: /odpowiedz b\. 4/i }));
    expect(screen.getByRole('button', { name: /odpowiedz b\. 4/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.click(screen.getByRole('button', { name: /zakończ test/i }));

    expect(await screen.findByRole('button', { name: /wróć do menu/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByTestId('kangur-exam-summary-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('kangur-exam-summary-emoji')).toHaveClass('inline-flex', 'text-6xl');
    expect(screen.getByTestId('kangur-exam-summary-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByTestId('kangur-exam-summary-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      '100% poprawnych odpowiedzi'
    );
    expect(screen.getByRole('list', { name: 'Przeglad pytan testowych' })).toBeInTheDocument();

    const reviewButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('#1'));
    expect(reviewButton).toBeDefined();

    await userEvent.click(reviewButton!);

    expect(screen.getByRole('button', { name: /podsumowanie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /poprzednie pytanie w podgladzie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /nastepne pytanie w podgladzie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByTestId('kangur-exam-review-shell')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('kangur-exam-review-point-chip')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('kangur-exam-review-illustration')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('kangur-exam-review-explanation')).toHaveClass(
      'soft-card',
      'border-sky-300'
    );
  });
});
