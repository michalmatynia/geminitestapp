/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import EnglishPronounsGame from '@/features/kangur/ui/components/EnglishPronounsGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishPronounsGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

describe('EnglishPronounsGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders German round chrome and incorrect feedback', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(screen.getByText('Runde 1/4')).toBeInTheDocument();
    expect(screen.getByText('Klicken')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prüfen ✓' })).toBeDisabled();
    expect(screen.getByText('Taylor posted: ___ just aced the test.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'he' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen ✓' }));

    expect(screen.getByText('Richtige Antwort: they.')).toBeInTheDocument();
    expect(screen.queryByText('Prawidłowa odpowiedź: they.')).not.toBeInTheDocument();
  });
});
