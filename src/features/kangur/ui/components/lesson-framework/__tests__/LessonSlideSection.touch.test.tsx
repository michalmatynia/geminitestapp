/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
  useKangurAuthSessionState: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

import LessonSlideSection from '../LessonSlideSection';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('LessonSlideSection touch mode', () => {
  it('uses larger touch-friendly slide pills and arrow controls on coarse pointers', () => {
    render(
      <KangurLessonNavigationProvider
        onBack={vi.fn()}
        secretLessonPill={{ isUnlocked: true, onOpen: vi.fn() }}
      >
        <LessonSlideSection
          slides={[
            { title: 'Slajd 1', content: <div>Pierwszy</div> },
            { title: 'Slajd 2', content: <div>Drugi</div> },
          ]}
          dotActiveClass='bg-orange-400'
          dotDoneClass='bg-orange-200'
          gradientClass='kangur-gradient-accent-amber'
        />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-slide-indicator-0')).toHaveClass(
      'h-11',
      'min-w-11',
      'touch-manipulation',
      'select-none'
    );
    expect(screen.getByTestId('lesson-slide-secret-indicator')).toHaveClass(
      'h-11',
      'min-w-[56px]',
      'touch-manipulation',
      'select-none'
    );
    expect(screen.getByTestId('lesson-slide-back-button')).toHaveClass(
      '[@media(pointer:coarse)]:min-h-11',
      '[@media(pointer:coarse)]:min-w-11'
    );
    expect(screen.getByTestId('lesson-slide-prev-button')).toHaveClass(
      '[@media(pointer:coarse)]:min-h-11',
      '[@media(pointer:coarse)]:min-w-11'
    );
    expect(screen.getByTestId('lesson-slide-next-button')).toHaveClass(
      '[@media(pointer:coarse)]:min-h-11',
      '[@media(pointer:coarse)]:min-w-11'
    );
  });
});
