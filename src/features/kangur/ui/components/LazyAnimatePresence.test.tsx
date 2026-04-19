/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { framerMotionLoadSpy } = vi.hoisted(() => ({
  framerMotionLoadSpy: vi.fn<() => void>(),
}));

vi.mock('@/features/kangur/ui/boot/boot-ready-signal', () => ({
  onBootReady: vi.fn(),
}));

vi.mock('framer-motion', () => {
  framerMotionLoadSpy();
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='mock-animate-presence'>{children}</div>
    ),
    motion: {
      div: ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div data-testid='mock-motion-div' {...props}>
          {children}
        </div>
      ),
      button: ({ children, ...props }: React.ComponentProps<'button'>) => (
        <button data-testid='mock-motion-button' {...props}>
          {children}
        </button>
      ),
    },
  };
});

describe('LazyAnimatePresence', () => {
  beforeEach(() => {
    vi.resetModules();
    framerMotionLoadSpy.mockClear();
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
      expect(framerMotionLoadSpy).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('mock-animate-presence')).toBeInTheDocument();
    expect(screen.getByTestId('mock-motion-div')).toBeInTheDocument();
    expect(screen.getByTestId('mock-motion-button')).toBeInTheDocument();
  });
});
