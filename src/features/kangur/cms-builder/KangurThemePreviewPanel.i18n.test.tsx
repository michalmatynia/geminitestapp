/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import plMessages from '@/i18n/messages/pl.json';
import { KANGUR_DEFAULT_DAILY_THEME } from '@/features/kangur/appearance/theme-settings';

import { KangurThemePreviewPanel } from './KangurThemePreviewPanel';

const renderPanel = ({
  locale,
  section,
  messages,
}: {
  locale: 'en' | 'pl';
  section: string | null;
  messages: typeof enMessages;
}): void => {
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <KangurThemePreviewPanel
        section={section}
        theme={KANGUR_DEFAULT_DAILY_THEME}
        mode='daily'
      />
    </NextIntlClientProvider>
  );
};

describe('KangurThemePreviewPanel i18n', () => {
  it('renders English preview labels by default', () => {
    renderPanel({ locale: 'en', section: null, messages: enMessages });

    expect(screen.getByText('Theme Preview')).toBeInTheDocument();
    expect(screen.getByText('Editing: Core Palette')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getAllByText('Primary').length).toBeGreaterThan(0);
  });

  it('renders Polish preview labels while resolving English section names', () => {
    renderPanel({
      locale: 'pl',
      section: 'Backgrounds and Surfaces',
      messages: plMessages,
    });

    expect(screen.getByText('Podglad motywu')).toBeInTheDocument();
    expect(screen.getByText('Edytujesz: Tla i powierzchnie')).toBeInTheDocument();
    expect(screen.getByText('Dzienny')).toBeInTheDocument();
    expect(screen.getByText('Powierzchnia szklanego panelu')).toBeInTheDocument();
    expect(screen.queryByText('Glass panel surface')).not.toBeInTheDocument();
  });
});
