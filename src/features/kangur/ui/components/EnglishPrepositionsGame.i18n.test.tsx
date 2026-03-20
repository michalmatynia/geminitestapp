/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishPrepositionsGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

describe('EnglishPrepositionsGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders German click-mode chrome and feedback', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(screen.getByText('Runde 1/9')).toBeInTheDocument();
    expect(screen.getByText('Präpositionen')).toBeInTheDocument();
    expect(screen.getByText('Wähle die Zeitpräposition.')).toBeInTheDocument();
    expect(screen.getByText('Genaue Uhrzeit -> at.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeDisabled();
    expect(screen.queryByText('Choose the time preposition.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'on' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByText('Richtige Antwort: at.')).toBeInTheDocument();
    expect(screen.queryByText('Correct answer: at.')).not.toBeInTheDocument();
  });
});
