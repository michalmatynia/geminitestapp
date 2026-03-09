/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

    expect(screen.getByText(/Myślenie logiczne to umiejętność/i)).toHaveClass('text-slate-700');
    expect(screen.getByText(/Logiczne myślenie pomaga:/i).parentElement).toHaveClass(
      'text-slate-600'
    );
  });

  it('uses the lighter copy palette in the logical patterns lesson', async () => {
    renderLesson(<LogicalPatternsLesson />);

    fireEvent.click(screen.getByRole('button', { name: /wzorce.*wprowadzenie/i }));

    expect(screen.getByText(/Wzorce sa wszedzie:/i).parentElement).toHaveClass('text-slate-600');

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findByText('Wzorce kolorów i kształtów');

    expect(screen.getByText(/^Wzorzec AB$/i)).toHaveClass('text-slate-400');
  });

  it('uses the lighter copy palette in the logical reasoning lesson', async () => {
    renderLesson(<LogicalReasoningLesson />);

    fireEvent.click(screen.getByRole('button', { name: /wnioskowanie.*jesli/i }));

    expect(screen.getByText(/Wnioskowanie to wyciaganie nowych wniosków/i)).toHaveClass(
      'text-slate-700'
    );

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findByText(/Jesli… to…/i);

    expect(getParagraphByTextContent('NIE znaczy')).toHaveClass('text-slate-500');
  });

  it('uses the lighter copy palette in the logical classification lesson', async () => {
    renderLesson(<LogicalClassificationLesson />);

    fireEvent.click(screen.getByRole('button', { name: /klasyfikacja.*wstep/i }));

    expect(screen.getByText(/Klasyfikacja to układanie rzeczy/i)).toHaveClass('text-slate-700');

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));
    await screen.findByText(/Grupowanie według cech/i);

    expect(screen.getByText(/Cecha: maja skrzydła/i)).toHaveClass('text-slate-500');
  });

  it('uses the lighter copy palette in the logical analogies lesson', () => {
    renderLesson(<LogicalAnalogiesLesson />);

    fireEvent.click(screen.getByRole('button', { name: /analogia.*wstep/i }));

    expect(screen.getByText('A : B = C : D')).toHaveClass('text-slate-700');
    expect(screen.getByText(/„A do B tak jak C do D"/i)).toHaveClass('text-slate-500');
    expect(screen.getByText(/Relacja: stworzenie/i)).toHaveClass('text-slate-600');
  });
});
