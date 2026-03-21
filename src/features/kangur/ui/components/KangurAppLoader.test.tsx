import { render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

import { KangurAppLoader } from './KangurAppLoader';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
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
    expect(panel).toHaveAttribute('data-loader-layout', 'expanded-card');
    expect(screen.getByTestId('kangur-app-loader-copy')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-app-loader-copy')).toHaveTextContent('Ladowanie');
  });

  it('does not render when hidden', () => {
    renderWithIntl(<KangurAppLoader visible={false} />);

    expect(screen.queryByTestId('kangur-app-loader')).not.toBeInTheDocument();
  });
});
