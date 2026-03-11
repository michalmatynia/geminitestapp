/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

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

    expect(screen.getByTestId('lesson-activity-secret-indicator')).toHaveAttribute(
      'aria-label',
      'Otworz sekretny panel'
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not repeat the inner title block when a subsection header already owns that content', () => {
    render(
      <LessonActivityStage
        accent='indigo'
        description='Trenuj pelne godziny i krotka wskazowke'
        headerTestId='lesson-activity-header'
        icon='🕐'
        onBack={vi.fn()}
        sectionHeader={{
          title: 'Ćwiczenie: Godziny',
          description: 'Trenuj pelne godziny i krotka wskazowke',
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
  });

  it('keeps the inner title block for standalone stages without a subsection header', () => {
    render(
      <LessonActivityStage
        accent='indigo'
        description='Przejdz przez szybkie zadania.'
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
    expect(screen.getByText('Przejdz przez szybkie zadania.')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
