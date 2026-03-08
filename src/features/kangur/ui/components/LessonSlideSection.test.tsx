/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LessonSlideSection from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('LessonSlideSection', () => {
  it('uses the shared empty-state surface when no slides are provided', () => {
    render(
      <LessonSlideSection
        slides={[]}
        onBack={vi.fn()}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='from-orange-400 to-yellow-400'
      />
    );

    expect(screen.getByTestId('lesson-slide-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
    expect(screen.getByText('Brak slajdu.')).toBeInTheDocument();
  });

  it('renders slide indicators as clickable Kangur micro pills', async () => {
    const onComplete = vi.fn();
    const onProgressChange = vi.fn();

    render(
      <LessonSlideSection
        slides={[
          { title: 'Slajd 1', content: <div>Pierwszy</div> },
          { title: 'Slajd 2', content: <div>Drugi</div> },
        ]}
        onBack={vi.fn()}
        onComplete={onComplete}
        onProgressChange={onProgressChange}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='from-orange-400 to-yellow-400'
      />
    );

    const firstIndicator = screen.getByTestId('lesson-slide-indicator-0');
    const secondIndicator = screen.getByTestId('lesson-slide-indicator-1');

    expect(screen.getByTestId('lesson-slide-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(firstIndicator).toHaveClass('kangur-cta-pill', 'bg-orange-400');
    expect(firstIndicator).toHaveClass('cursor-pointer');
    expect(firstIndicator).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.queryByRole('button', { name: /nastepny/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /poprzedni/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gotowe!/i })).not.toBeInTheDocument();
    expect(secondIndicator).toHaveClass(
      'kangur-cta-pill',
      'kangur-step-pill-pending',
      'cursor-pointer'
    );
    expect(onProgressChange).toHaveBeenLastCalledWith(1, 2);

    fireEvent.click(secondIndicator);

    expect(firstIndicator).toHaveClass('bg-orange-200');
    expect(firstIndicator).not.toHaveAttribute('aria-current');
    expect(secondIndicator).toHaveClass('bg-orange-400');
    expect(secondIndicator).toHaveAttribute('aria-current', 'step');
    expect(onProgressChange).toHaveBeenLastCalledWith(2, 2);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Drugi')).toBeInTheDocument();
  });

  it('uses the lesson navigation context for the top back action', () => {
    const onBack = vi.fn();

    render(
      <KangurLessonNavigationProvider onBack={onBack}>
        <LessonSlideSection
          slides={[{ title: 'Slajd 1', content: <div>Pierwszy</div> }]}
          dotActiveClass='bg-orange-400'
          dotDoneClass='bg-orange-200'
          gradientClass='from-orange-400 to-yellow-400'
        />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    expect(screen.getByRole('button', { name: 'Wróć do tematów' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
