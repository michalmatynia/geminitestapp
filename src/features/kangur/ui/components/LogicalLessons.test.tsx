/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

import LogicalAnalogiesLesson from '@/features/kangur/ui/components/LogicalAnalogiesLesson';
import LogicalClassificationLesson from '@/features/kangur/ui/components/LogicalClassificationLesson';
import LogicalPatternsLesson from '@/features/kangur/ui/components/LogicalPatternsLesson';
import LogicalReasoningLesson from '@/features/kangur/ui/components/LogicalReasoningLesson';
import LogicalThinkingLesson from '@/features/kangur/ui/components/LogicalThinkingLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (ui: ReactNode) =>
  render(<KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>);

const getParagraphByTextContent = (snippet: string): HTMLElement =>
  screen.getByText(
    (_, element) => element?.tagName === 'P' && element.textContent?.includes(snippet) === true
  );

describe('Logical lessons shared surfaces', () => {
  it('uses the shared lesson hub and lighter copy palette in the logical thinking lesson', () => {
    renderLesson(<LogicalThinkingLesson />);

    expect(screen.getByTestId('lesson-hub-section-wprowadzenie')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-wzorce')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-wprowadzenie')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /wprowadzenie/i }));

    expect(screen.getByText(/Myślenie logiczne to umiejętność/i)).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByText(/Logiczne myślenie pomaga:/i).parentElement).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
  });

  it('uses the lighter copy palette in the logical patterns lesson', async () => {
    renderLesson(<LogicalPatternsLesson />);

    fireEvent.click(screen.getByRole('button', { name: /wzorce.*wprowadzenie/i }));

    expect(screen.getByText(/Wzorce są wszędzie:/i).parentElement).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findAllByText('Wzorce kolorów i kształtów');

    expect(screen.getByText(/^Wzorzec AB$/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter copy palette in the logical reasoning lesson', async () => {
    renderLesson(<LogicalReasoningLesson />);

    fireEvent.click(screen.getByRole('button', { name: /wnioskowanie.*jeśli/i }));

    expect(screen.getByText(/Wnioskowanie to wyciąganie nowych wniosków/i)).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findByRole('heading', { name: /Jeśli… to…/i, level: 2 });

    expect(getParagraphByTextContent('NIE znaczy')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter copy palette in the logical classification lesson', async () => {
    renderLesson(<LogicalClassificationLesson />);

    fireEvent.click(screen.getByRole('button', { name: /klasyfikacja.*wstęp/i }));

    expect(screen.getByText(/Klasyfikacja to układanie rzeczy/i)).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findByRole('heading', { name: /Grupowanie według cech/i, level: 2 });

    expect(screen.getByText(/Cecha: mają skrzydła/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter copy palette in the logical analogies lesson', () => {
    renderLesson(<LogicalAnalogiesLesson />);

    fireEvent.click(screen.getByRole('button', { name: /analogia.*wstęp/i }));

    expect(screen.getByText('A : B = C : D')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByText(/„A do B tak jak C do D"/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText(/Relacja: stworzenie/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
