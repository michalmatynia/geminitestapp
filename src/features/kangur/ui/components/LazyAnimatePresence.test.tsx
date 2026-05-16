/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  animatePresencePropsSpy,
  framerMotionLoadSpy,
  motionButtonPropsSpy,
  motionDivPropsSpy,
} = vi.hoisted(() => ({
  animatePresencePropsSpy: vi.fn<(props: Record<string, unknown>) => void>(),
  framerMotionLoadSpy: vi.fn<() => void>(),
  motionButtonPropsSpy: vi.fn<(props: Record<string, unknown>) => void>(),
  motionDivPropsSpy: vi.fn<(props: Record<string, unknown>) => void>(),
}));

vi.mock('@/features/kangur/ui/boot/boot-ready-signal', () => ({
  onBootReady: vi.fn(),
}));

vi.mock('framer-motion', () => {
  framerMotionLoadSpy();
  return {
    AnimatePresence: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
      animatePresencePropsSpy(props);
      return <div data-testid='mock-animate-presence'>{children}</div>;
    },
    motion: {
      div: ({ children, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) => {
        motionDivPropsSpy(props);
        return <div data-testid='mock-motion-div'>{children}</div>;
      },
      button: ({ children, ...props }: React.ComponentProps<'button'> & Record<string, unknown>) => {
        motionButtonPropsSpy(props);
        return <button data-testid='mock-motion-button'>{children}</button>;
      },
    },
  };
});

describe('LazyAnimatePresence', () => {
  beforeEach(() => {
    vi.resetModules();
    animatePresencePropsSpy.mockClear();
    framerMotionLoadSpy.mockClear();
    motionButtonPropsSpy.mockClear();
    motionDivPropsSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps framer-motion unloaded when motion loading is disabled', async () => {
    const { LazyAnimatePresence, LazyMotionButton, LazyMotionDiv } = await import(
      '@/features/kangur/ui/components/LazyAnimatePresence'
    );

    render(
      <>
        <LazyAnimatePresence loadMotion={false}>
          <div>animate-child</div>
        </LazyAnimatePresence>
        <LazyMotionDiv loadMotion={false}>motion-child</LazyMotionDiv>
        <LazyMotionButton loadMotion={false}>button-child</LazyMotionButton>
      </>
    );

    await Promise.resolve();

    expect(framerMotionLoadSpy).not.toHaveBeenCalled();
    expect(screen.getByText('animate-child')).toBeInTheDocument();
    expect(screen.getByText('motion-child')).toBeInTheDocument();
    expect(screen.getByText('button-child')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-animate-presence')).toBeNull();
    expect(screen.queryByTestId('mock-motion-div')).toBeNull();
    expect(screen.queryByTestId('mock-motion-button')).toBeNull();
  });

  it('loads framer-motion when motion loading is enabled', async () => {
    const { LazyAnimatePresence, LazyMotionButton, LazyMotionDiv } = await import(
      '@/features/kangur/ui/components/LazyAnimatePresence'
    );

    render(
      <>
        <LazyAnimatePresence loadMotion>
          <div>animate-child</div>
        </LazyAnimatePresence>
        <LazyMotionDiv loadMotion>motion-child</LazyMotionDiv>
        <LazyMotionButton loadMotion>button-child</LazyMotionButton>
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-animate-presence')).toBeInTheDocument();
      expect(screen.getByTestId('mock-motion-div')).toBeInTheDocument();
      expect(screen.getByTestId('mock-motion-button')).toBeInTheDocument();
    });
  });

  it('does not replay hidden initial states when motion is enabled after a plain render', async () => {
    const { LazyAnimatePresence, LazyMotionButton, LazyMotionDiv } = await import(
      '@/features/kangur/ui/components/LazyAnimatePresence'
    );

    const { rerender } = render(
      <>
        <LazyAnimatePresence loadMotion={false}>
          <div>animate-child</div>
        </LazyAnimatePresence>
        <LazyMotionDiv
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 12 }}
          loadMotion={false}
        >
          motion-child
        </LazyMotionDiv>
        <LazyMotionButton
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          loadMotion={false}
        >
          button-child
        </LazyMotionButton>
      </>
    );

    rerender(
      <>
        <LazyAnimatePresence loadMotion>
          <div>animate-child</div>
        </LazyAnimatePresence>
        <LazyMotionDiv
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 12 }}
          loadMotion
        >
          motion-child
        </LazyMotionDiv>
        <LazyMotionButton
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          loadMotion
        >
          button-child
        </LazyMotionButton>
      </>
    );

    await waitFor(() => {
      expect(animatePresencePropsSpy).toHaveBeenCalled();
      expect(motionDivPropsSpy).toHaveBeenCalled();
      expect(motionButtonPropsSpy).toHaveBeenCalled();
    });

    expect(animatePresencePropsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ initial: false })
    );
    expect(motionDivPropsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ initial: false })
    );
    expect(motionButtonPropsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ initial: false })
    );
  });
});
