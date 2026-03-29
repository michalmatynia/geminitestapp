/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import KangurExam from '@/features/kangur/ui/components/KangurExam';
import { KangurLessonPrintProvider } from '@/features/kangur/ui/context/KangurLessonPrintContext';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

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

    expect(screen.getByTestId('kangur-exam-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('kangur-exam-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-exam-question-2024_1'
    );
    expect(screen.getByTestId('kangur-exam-question-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-title',
      'Pytanie 1'
    );
    expect(screen.getByTestId('kangur-exam-question-print-panel')).toHaveClass(
      'mx-auto',
      'max-w-4xl',
      'items-center',
      'text-center'
    );
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent('Pytanie 1');
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent(
      'Ile to jest 2 + 2?'
    );
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent(
      'Otwórz tę lekcję na ekranie, aby odpowiedzieć na pytanie StudiQ Matematycznego interaktywnie.'
    );
    expect(screen.getByTestId('kangur-exam-print-choice-1')).toHaveTextContent('B. 4');
    expect(screen.getByTestId('kangur-exam-print-summary').nextElementSibling).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(screen.getByTestId('kangur-exam-question-shell')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('kangur-exam-progress-pill')).toHaveTextContent('1/1');
    expect(
      within(screen.getByTestId('kangur-exam-question-shell')).getByText('Ile to jest 2 + 2?')
    ).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByTestId('kangur-exam-progress-pill')).toHaveAttribute(
      'aria-label',
      'Pytanie 1 z 1'
    );
    expect(screen.getByTestId('kangur-exam-question-point-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(await screen.findByRole('button', { name: /czytaj pytanie/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pytanie 1' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-exam-question-illustration')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByRole('button', { name: /brak poprzedniego pytania/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: /zakończ test/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('group', { name: 'Pytanie 1' })).toHaveClass('w-full', 'max-w-2xl');
    expect(screen.getByRole('button', { name: /odpowiedź b\. 4/i })).toHaveClass(
      'justify-start',
      'text-left'
    );

    await userEvent.click(screen.getByRole('button', { name: /odpowiedź b\. 4/i }));
    expect(screen.getByRole('button', { name: /odpowiedź b\. 4/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.click(screen.getByRole('button', { name: /zakończ test/i }));

    expect(screen.getByTestId('kangur-exam-summary-print-panel')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('kangur-exam-summary-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-exam-summary'
    );
    expect(
      screen.getByRole('navigation', { name: 'Nawigacja podsumowania Kangur Matematyczny' })
    ).toHaveClass(...splitClasses(LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME));
    expect(
      screen.getByRole('group', { name: 'Nawigacja podsumowania Kangur Matematyczny' })
    ).toHaveClass(...splitClasses(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME));
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent('Wynik 1/1');
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent(
      '100% poprawnych odpowiedzi'
    );
    expect(screen.getByTestId('kangur-exam-print-summary')).toHaveTextContent(
      'Otwórz tę lekcję na ekranie, aby przejrzeć odpowiedzi i rozwiązania StudiQ Matematycznego.'
    );
    expect(
      await screen.findByRole('button', { name: 'Wróć do menu' })
    ).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByTestId('kangur-exam-summary-shell')).toHaveClass('glass-panel', 'kangur-panel-soft');
    expect(screen.getByText('Wynik: 1/1')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      within(screen.getByTestId('kangur-exam-summary-shell')).getByText(
        '100% poprawnych odpowiedzi'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('kangur-exam-summary-emoji')).toHaveClass('inline-flex', 'text-6xl');
    expect(screen.getByTestId('kangur-exam-summary-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByTestId('kangur-exam-summary-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      '100% poprawnych odpowiedzi'
    );
    expect(screen.getByRole('list', { name: 'Przegląd pytań testowych' })).toBeInTheDocument();

    const reviewButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('#1'));
    expect(reviewButton).toBeDefined();

    await userEvent.click(reviewButton!);

    expect(screen.getByTestId('kangur-exam-review-print-panel')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('kangur-exam-review-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'kangur-exam-review-2024_1'
    );
    expect(screen.getByTestId('kangur-exam-review-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-title',
      'Pytanie 1'
    );
    expect(screen.getAllByRole('navigation', { name: 'Nawigacja podglądu pytań' })[1]).toHaveClass(
      ...splitClasses(LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME)
    );
    expect(screen.getAllByRole('group', { name: 'Nawigacja podglądu pytań' })[1]).toHaveClass(
      ...splitClasses(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME)
    );
    expect(screen.getByTestId('kangur-exam-review-print-summary')).toHaveTextContent(
      'Ile to jest 2 + 2?'
    );
    expect(screen.getByRole('button', { name: /podsumowanie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: /podsumowanie/i })).not.toHaveTextContent(
      'Podsumowanie'
    );
    expect(screen.getByRole('button', { name: /poprzednie pytanie w podglądzie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: /następne pytanie w podglądzie/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByTestId('kangur-exam-review-choice-1')).toHaveClass(
      'justify-start',
      'text-left'
    );
    expect(screen.getByTestId('kangur-exam-review-shell')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(
      within(screen.getByTestId('kangur-exam-review-shell')).getByText('Ile to jest 2 + 2?')
    ).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByTestId('kangur-exam-review-point-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('kangur-exam-review-illustration')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('kangur-exam-review-explanation')).toHaveClass(
      'soft-card'
    );
  });

  it('renders a print button inside exam question navigation and routes it through the shared lesson print context', async () => {
    const onPrintPanel = vi.fn();
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

    render(
      <KangurLessonPrintProvider onPrintPanel={onPrintPanel}>
        <KangurExam />
      </KangurLessonPrintProvider>
    );

    const printButton = screen.getByTestId('kangur-exam-print-button');
    expect(printButton).toHaveAttribute('aria-label', 'Drukuj panel');

    await userEvent.click(printButton);

    expect(onPrintPanel).toHaveBeenCalledTimes(1);
    expect(onPrintPanel).toHaveBeenCalledWith('kangur-exam-question-2024_1');
  });

  it('renders targeted print actions for the finished summary and review panels', async () => {
    const onPrintPanel = vi.fn();
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

    render(
      <KangurLessonPrintProvider onPrintPanel={onPrintPanel}>
        <KangurExam />
      </KangurLessonPrintProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /odpowiedź b\. 4/i }));
    await userEvent.click(screen.getByRole('button', { name: /zakończ test/i }));

    const summaryPrintButton = screen.getByTestId('kangur-exam-summary-print-button');
    await userEvent.click(summaryPrintButton);

    expect(onPrintPanel).toHaveBeenCalledWith('kangur-exam-summary');

    const reviewButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('#1'));
    expect(reviewButton).toBeDefined();

    await userEvent.click(reviewButton!);
    await userEvent.click(screen.getByTestId('kangur-exam-print-button'));

    expect(onPrintPanel).toHaveBeenLastCalledWith('kangur-exam-review-2024_1');
  });
});
