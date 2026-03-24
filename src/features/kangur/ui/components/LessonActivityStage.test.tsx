/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KangurLessonPrintProvider } from '@/features/kangur/ui/context/KangurLessonPrintContext';

describe('LessonActivityStage', () => {
  it('renders the unlocked secret pill in game subsections and routes it through the shared context', () => {
    const onOpen = vi.fn();

    render(
      <KangurLessonNavigationProvider
        onBack={vi.fn()}
        secretLessonPill={{ isUnlocked: true, onOpen }}
      >
        <LessonActivityStage
          accent='indigo'
          icon='🕐'
          onBack={vi.fn()}
          title='Ćwiczenie: Godziny'
        >
          <div>Gra</div>
        </LessonActivityStage>
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-activity-secret-indicator'));

    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).toHaveAttribute(
      'data-testid',
      'lesson-activity-back-button'
    );
    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).toHaveClass(
      'justify-center',
      'px-4'
    );
    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).not.toHaveTextContent(
      'Wróć do tematów'
    );
    expect(screen.getByRole('navigation', { name: 'Nawigacja lekcji' })).toHaveClass(
      'items-center'
    );
    expect(screen.getByTestId('lesson-activity-secret-indicator')).toHaveAttribute(
      'aria-label',
      'Otwórz sekretny panel'
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not repeat the inner title block when a subsection header already owns that content', () => {
    render(
      <LessonActivityStage
        accent='indigo'
        description='Trenuj pełne godziny i krótką wskazówkę'
        headerTestId='lesson-activity-header'
        icon='🕐'
        onBack={vi.fn()}
        sectionHeader={{
          title: 'Ćwiczenie: Godziny',
          description: 'Trenuj pełne godziny i krótką wskazówkę',
          emoji: '🕐',
          isGame: true,
        }}
        shellTestId='lesson-activity-shell'
        title='Ćwiczenie: Godziny'
      >
        <div>Gra</div>
      </LessonActivityStage>
    );

    expect(screen.queryByTestId('lesson-activity-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-activity-shell')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-activity-shell').parentElement).toHaveClass('mx-auto');
  });

  it('keeps the inner title block for standalone stages without a subsection header', () => {
    render(
      <LessonActivityStage
        accent='indigo'
        description='Przejdź przez szybkie zadania.'
        headerTestId='lesson-activity-header'
        icon='🕐'
        onBack={vi.fn()}
        shellTestId='lesson-activity-shell'
        title='Ćwiczenia'
      >
        <div>Gra</div>
      </LessonActivityStage>
    );

    expect(screen.getByTestId('lesson-activity-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ćwiczenia' })).toBeInTheDocument();
    expect(
      within(screen.getByTestId('lesson-activity-header')).getByText(
        'Przejdź przez szybkie zadania.'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('lesson-activity-shell').parentElement).toHaveClass('mx-auto');
    expect(screen.getByTestId('lesson-activity-shell')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('lesson-activity-stage-print-summary')).toHaveTextContent(
      'Ćwiczenia'
    );
    expect(screen.getByTestId('lesson-activity-stage-print-summary')).toHaveTextContent(
      'Przejdź przez szybkie zadania.'
    );
    expect(screen.getByTestId('lesson-activity-stage-print-summary')).toHaveTextContent(
      'Otwórz tę lekcję na ekranie, aby wykonać to ćwiczenie interaktywnie.'
    );
    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).not.toHaveTextContent(
      'Wróć do tematów'
    );
  });

  it('can render a plain shell without the shared glass panel wrapper', () => {
    render(
      <LessonActivityStage
        accent='sky'
        icon='🎹'
        onBack={vi.fn()}
        shellTestId='lesson-activity-plain-shell'
        shellVariant='plain'
        title='Powtorz melodie'
      >
        <div>Gra muzyczna</div>
      </LessonActivityStage>
    );

    expect(screen.getByTestId('lesson-activity-plain-shell')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-activity-plain-shell').parentElement).toHaveClass('mx-auto');
    expect(screen.getByTestId('lesson-activity-plain-shell').className).toContain('flex w-full flex-col');
    expect(screen.getByTestId('lesson-activity-plain-shell')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByText('Gra muzyczna')).toBeInTheDocument();
  });

  it('renders a panel-level print button when the active lesson is printable', () => {
    const onPrintPanel = vi.fn();

    render(
      <KangurLessonPrintProvider onPrintPanel={onPrintPanel}>
        <LessonActivityStage
          accent='indigo'
          icon='🕐'
          onBack={vi.fn()}
          title='Ćwiczenie: Godziny'
        >
          <div>Gra</div>
        </LessonActivityStage>
      </KangurLessonPrintProvider>
    );

    const [printButton] = screen.getAllByTestId('lesson-activity-print-button');
    const shell = screen.getByText('Gra').closest('[data-kangur-print-panel="true"]');
    expect(screen.getAllByTestId('lesson-activity-print-button')).toHaveLength(2);
    expect(printButton).toHaveAttribute('aria-label', 'Drukuj panel');
    expect(shell).not.toBeNull();
    expect(shell).toHaveAttribute('data-kangur-print-panel-id');
    expect(shell).toHaveAttribute('data-kangur-print-panel-title', 'Ćwiczenie: Godziny');

    fireEvent.click(printButton);

    expect(onPrintPanel).toHaveBeenCalledTimes(1);
    expect(onPrintPanel).toHaveBeenCalledWith(
      shell?.getAttribute('data-kangur-print-panel-id')
    );
  });
});
