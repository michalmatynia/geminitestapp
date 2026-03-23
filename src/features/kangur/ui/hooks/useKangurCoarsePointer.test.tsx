/**
 * @vitest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurCoarsePointer } from './useKangurCoarsePointer';

const pointerState = {
  coarse: false,
  hoverNone: false,
  maxTouchPoints: 0,
};

const setPointerState = ({
  coarse,
  hoverNone,
  maxTouchPoints,
}: {
  coarse: boolean;
  hoverNone: boolean;
  maxTouchPoints: number;
}): void => {
  pointerState.coarse = coarse;
  pointerState.hoverNone = hoverNone;
  pointerState.maxTouchPoints = maxTouchPoints;
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });
};

function CoarsePointerProbe(): JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  return <div data-testid='coarse-pointer-state'>{isCoarsePointer ? 'coarse' : 'fine'}</div>;
}

describe('useKangurCoarsePointer', () => {
  beforeEach(() => {
    setPointerState({
      coarse: false,
      hoverNone: false,
      maxTouchPoints: 0,
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches:
          query === '(pointer: coarse)'
            ? pointerState.coarse
            : query === '(hover: none)'
              ? pointerState.hoverNone
              : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
    });

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
    });
  });

  it('tracks a coarse primary pointer when the media query matches', () => {
    render(<CoarsePointerProbe />);

    expect(screen.getByTestId('coarse-pointer-state')).toHaveTextContent('fine');

    act(() => {
      setPointerState({
        coarse: true,
        hoverNone: false,
        maxTouchPoints: 0,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('coarse-pointer-state')).toHaveTextContent('coarse');
  });

  it('falls back to touch-only devices that expose touch points without a coarse primary pointer', () => {
    render(<CoarsePointerProbe />);

    expect(screen.getByTestId('coarse-pointer-state')).toHaveTextContent('fine');

    act(() => {
      setPointerState({
        coarse: false,
        hoverNone: true,
        maxTouchPoints: 5,
      });
      window.dispatchEvent(new Event('orientationchange'));
    });

    expect(screen.getByTestId('coarse-pointer-state')).toHaveTextContent('coarse');
  });
});
