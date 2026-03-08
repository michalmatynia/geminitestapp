/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurPageContainer } from '@/features/kangur/ui/design/primitives';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';

import { KangurRouteAccessibilityAnnouncer } from './KangurRouteAccessibilityAnnouncer';

describe('KangurRouteAccessibilityAnnouncer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('announces the next Kangur page and focuses the main region without scrolling', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const { rerender } = render(
      <KangurRoutingProvider
        basePath='/kangur'
        embedded={false}
        pageKey='Game'
        requestedPath='/kangur'
      >
        <KangurRouteAccessibilityAnnouncer />
        <KangurPageContainer>
          <h1>Start</h1>
        </KangurPageContainer>
      </KangurRoutingProvider>
    );

    const mainRegion = screen.getByRole('main');
    expect(mainRegion).toHaveAttribute('data-kangur-route-main', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('');

    rerender(
      <KangurRoutingProvider
        basePath='/kangur'
        embedded={false}
        pageKey='Lessons'
        requestedPath='/kangur/lessons'
      >
        <KangurRouteAccessibilityAnnouncer />
        <KangurPageContainer>
          <h1>Lekcje</h1>
        </KangurPageContainer>
      </KangurRoutingProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Widok: Lekcje');
    });
    expect(screen.getByRole('main')).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
