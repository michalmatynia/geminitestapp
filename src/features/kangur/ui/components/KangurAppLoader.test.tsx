import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

import { KangurAppLoader } from './KangurAppLoader';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

const mutationObserverInstances: Array<{
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

describe('KangurAppLoader', () => {
  beforeEach(() => {
    mutationObserverInstances.length = 0;

    class TestMutationObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);

      constructor(_callback: MutationCallback) {
        mutationObserverInstances.push(this);
      }
    }

    vi.stubGlobal(
      'MutationObserver',
      TestMutationObserver as unknown as typeof MutationObserver
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the larger classic loader card with accessible boot loader markers', () => {
    renderWithIntl(<KangurAppLoader visible />);

    const loader = screen.getByTestId('kangur-app-loader');
    const panel = screen.getByTestId('kangur-app-loader-panel');

    expect(loader).toHaveAttribute('aria-busy', 'true');
    expect(loader).toHaveAttribute('aria-live', 'polite');
    expect(loader).toHaveClass('pointer-events-none');
    expect(panel).toHaveAttribute('data-loader-layout', 'expanded-card');
    expect(screen.getByTestId('kangur-app-loader-copy')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-app-loader-copy')).not.toHaveTextContent('Ładowanie');
    expect(loader).toHaveAttribute('data-loader-offset-top-bar', 'false');
  });

  it('can reserve the top-bar slot while the loader is visible', () => {
    renderWithIntl(<KangurAppLoader offsetTopBar visible />);

    const loader = screen.getByTestId('kangur-app-loader');

    expect(loader).toHaveAttribute('data-loader-offset-top-bar', 'true');
    expect(loader).toHaveClass(
      'inset-x-0',
      'bottom-0',
      'top-[var(--kangur-top-bar-height,88px)]'
    );
  });

  it('does not render when hidden', () => {
    renderWithIntl(<KangurAppLoader visible={false} />);

    expect(screen.queryByTestId('kangur-app-loader')).not.toBeInTheDocument();
  });

  it('uses mutation observation instead of interval polling when available', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    renderWithIntl(<KangurAppLoader visible />);

    expect(mutationObserverInstances).not.toHaveLength(0);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('falls back to interval polling when MutationObserver is unavailable', () => {
    vi.stubGlobal('MutationObserver', undefined);
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    renderWithIntl(<KangurAppLoader visible />);

    expect(setIntervalSpy).toHaveBeenCalled();
  });
});
