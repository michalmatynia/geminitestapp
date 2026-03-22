import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

import { KangurAppLoader } from './KangurAppLoader';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('KangurAppLoader', () => {
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
    expect(screen.getByTestId('kangur-app-loader-copy')).toHaveTextContent('Ładowanie');
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
});
