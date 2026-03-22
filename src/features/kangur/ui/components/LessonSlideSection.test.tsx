/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const serializeMotionValue = (value: unknown): string | undefined =>
    value === undefined ? undefined : JSON.stringify(value);

  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }): React.JSX.Element {
      return React.createElement(
        tag,
        {
          ...props,
          'data-motion-initial': serializeMotionValue(initial),
          'data-motion-animate': serializeMotionValue(animate),
          'data-motion-exit': serializeMotionValue(exit),
          'data-motion-transition': serializeMotionValue(transition),
        },
        children
      );
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: createMotionTag('div'),
    },
    useReducedMotion: () => false,
  };
});

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

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
        gradientClass='kangur-gradient-accent-amber'
      />
    );

    expect(screen.getByTestId('lesson-slide-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
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
        gradientClass='kangur-gradient-accent-amber'
      />
    );

    const firstIndicator = screen.getByTestId('lesson-slide-indicator-0');
    const secondIndicator = screen.getByTestId('lesson-slide-indicator-1');

    expect(screen.getByTestId('lesson-slide-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(firstIndicator).toHaveClass('kangur-cta-pill', 'bg-orange-400');
    expect(firstIndicator).toHaveClass('cursor-pointer');
    expect(firstIndicator).toHaveAttribute('aria-current', 'step');
    const backButton = screen.getByRole('button', { name: 'Wróć do tematów' });
    expect(backButton).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(backButton).not.toHaveTextContent('Wróć do tematów');
    expect(backButton).toHaveAttribute('title', 'Wróć do tematów');
    expect(backButton).toHaveAttribute('data-testid', 'lesson-slide-back-button');
    expect(screen.getByTestId('lesson-slide-navigation-shell')).toHaveClass(
      'items-center'
    );
    expect(screen.getByTestId('lesson-slide-prev-button')).toBeDisabled();
    expect(screen.getByTestId('lesson-slide-next-button')).toHaveAttribute(
      'aria-label',
      'Następny panel'
    );
    expect(screen.getByTestId('lesson-slide-next-button')).not.toBeDisabled();
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
    expect(screen.getByTestId('lesson-slide-prev-button')).toHaveAttribute(
      'aria-label',
      'Poprzedni panel'
    );
    expect(screen.getByTestId('lesson-slide-prev-button')).not.toBeDisabled();
    expect(screen.getByTestId('lesson-slide-next-button')).toBeDisabled();
  });

  it('uses the lesson navigation context for the top back action', () => {
    const onBack = vi.fn();

    render(
      <KangurLessonNavigationProvider onBack={onBack}>
        <LessonSlideSection
          slides={[{ title: 'Slajd 1', content: <div>Pierwszy</div> }]}
          dotActiveClass='bg-orange-400'
          dotDoneClass='bg-orange-200'
          gradientClass='kangur-gradient-accent-amber'
        />
      </KangurLessonNavigationProvider>
    );

    const backButton = screen.getByRole('button', { name: 'Wróć do tematów' });

    fireEvent.click(backButton);

    expect(backButton).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(backButton).not.toHaveTextContent('Wróć do tematów');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses bottom panel navigation to move within the active subsection', async () => {
    render(
      <LessonSlideSection
        slides={[
          { title: 'Slajd 1', content: <div>Pierwszy</div> },
          { title: 'Slajd 2', content: <div>Drugi</div> },
          { title: 'Slajd 3', content: <div>Trzeci</div> },
        ]}
        onBack={vi.fn()}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='kangur-gradient-accent-amber'
      />
    );

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    expect(await screen.findByText('Drugi')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-prev-button')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-next-button')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    expect(await screen.findByText('Trzeci')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-prev-button')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-prev-button')).not.toBeDisabled();
    expect(screen.getByTestId('lesson-slide-next-button')).toBeDisabled();
  });

  it('renders the unlocked secret pill and routes it through the shared lesson navigation context', () => {
    const onOpen = vi.fn();

    render(
      <KangurLessonNavigationProvider
        onBack={vi.fn()}
        secretLessonPill={{ isUnlocked: true, onOpen }}
      >
        <LessonSlideSection
          slides={[{ title: 'Slajd 1', content: <div>Pierwszy</div> }]}
          dotActiveClass='bg-orange-400'
          dotDoneClass='bg-orange-200'
          gradientClass='kangur-gradient-accent-amber'
        />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-slide-secret-indicator'));

    expect(screen.getByTestId('lesson-slide-secret-indicator')).toHaveAttribute(
      'aria-label',
      'Otwórz sekretny panel'
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('uses the canonical Lekcje transition preset for subsection slides', () => {
    render(
      <LessonSlideSection
        slides={[
          { title: 'Slajd 1', content: <div>Pierwszy</div> },
          { title: 'Slajd 2', content: <div>Drugi</div> },
        ]}
        onBack={vi.fn()}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='kangur-gradient-accent-amber'
      />
    );

    const transitionShell = screen.getByTestId('lesson-slide-shell').parentElement;

    expect(transitionShell).not.toBeNull();
    expect(transitionShell).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 0.92, y: 12 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-exit',
      JSON.stringify({ opacity: 0.98, y: -4 })
    );
    expect(transitionShell).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.32, ease: [0.22, 1, 0.36, 1] })
    );
  });
});
