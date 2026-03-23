/**
 * @vitest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurMobileBreakpoint } from './useKangurMobileBreakpoint';

type ViewportEventName = 'resize' | 'scroll';

const viewportState = {
  innerWidth: 1024,
  visualWidth: 1024,
  mobileMatches: false,
};

const visualViewportListeners = new Map<ViewportEventName, Set<() => void>>();

const setViewportState = ({
  innerWidth,
  visualWidth,
  mobileMatches,
}: {
  innerWidth: number;
  visualWidth: number;
  mobileMatches: boolean;
}): void => {
  viewportState.innerWidth = innerWidth;
  viewportState.visualWidth = visualWidth;
  viewportState.mobileMatches = mobileMatches;
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: innerWidth,
    writable: true,
  });
};

const emitVisualViewportEvent = (eventName: ViewportEventName): void => {
  visualViewportListeners.get(eventName)?.forEach((listener) => listener());
};

function MobileBreakpointProbe(): JSX.Element {
  const isMobile = useKangurMobileBreakpoint();
  return <div data-testid='mobile-breakpoint-state'>{isMobile ? 'mobile' : 'desktop'}</div>;
}

describe('useKangurMobileBreakpoint', () => {
  beforeEach(() => {
    visualViewportListeners.clear();
    setViewportState({
      innerWidth: 1024,
      visualWidth: 1024,
      mobileMatches: false,
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 639px)' ? viewportState.mobileMatches : false,
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
        get width() {
          return viewportState.visualWidth;
        },
        addEventListener: (eventName: ViewportEventName, listener: () => void) => {
          const listeners = visualViewportListeners.get(eventName) ?? new Set<() => void>();
          listeners.add(listener);
          visualViewportListeners.set(eventName, listeners);
        },
        removeEventListener: (eventName: ViewportEventName, listener: () => void) => {
          visualViewportListeners.get(eventName)?.delete(listener);
        },
      },
      writable: true,
    });
  });

  it('updates when the window is resized into the mobile breakpoint', () => {
    render(<MobileBreakpointProbe />);

    expect(screen.getByTestId('mobile-breakpoint-state')).toHaveTextContent('desktop');

    act(() => {
      setViewportState({
        innerWidth: 390,
        visualWidth: 390,
        mobileMatches: true,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('mobile-breakpoint-state')).toHaveTextContent('mobile');
  });

  it('reacts to visual viewport changes when the browser chrome changes the usable width', () => {
    setViewportState({
      innerWidth: 760,
      visualWidth: 760,
      mobileMatches: false,
    });

    render(<MobileBreakpointProbe />);

    expect(screen.getByTestId('mobile-breakpoint-state')).toHaveTextContent('desktop');

    act(() => {
      setViewportState({
        innerWidth: 760,
        visualWidth: 390,
        mobileMatches: true,
      });
      emitVisualViewportEvent('resize');
    });

    expect(screen.getByTestId('mobile-breakpoint-state')).toHaveTextContent('mobile');
  });
});
