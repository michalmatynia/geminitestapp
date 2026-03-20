/**
 * @vitest-environment jsdom
 */

import { NextIntlClientProvider } from 'next-intl';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
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
      <NextIntlClientProvider locale='pl' messages={plMessages}>
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
      </NextIntlClientProvider>
    );

    const mainRegion = screen.getByRole('main');
    expect(mainRegion).toHaveAttribute('data-kangur-route-main', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('');

    rerender(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
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
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Widok: Lekcje');
    });
    expect(screen.getByRole('main')).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('announces language switching when the localized href changes without changing the Kangur page', async () => {
    const { rerender } = render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <KangurRoutingProvider
          basePath='/kangur'
          embedded={false}
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/pl/kangur/lessons'
        >
          <KangurRouteAccessibilityAnnouncer />
          <KangurPageContainer>
            <h1>Lekcje</h1>
          </KangurPageContainer>
        </KangurRoutingProvider>
      </NextIntlClientProvider>
    );

    rerender(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <KangurRoutingProvider
          basePath='/kangur'
          embedded={false}
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/en/kangur/lessons'
        >
          <KangurRouteAccessibilityAnnouncer />
          <KangurPageContainer>
            <h1>Lekcje</h1>
          </KangurPageContainer>
        </KangurRoutingProvider>
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Przelaczanie jezyka: Lekcje');
    });
  });
});
