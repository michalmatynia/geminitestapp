/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import EnglishPronounsWarmupGame from '@/features/kangur/ui/components/EnglishPronounsWarmupGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishPronounsWarmupGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

describe('EnglishPronounsWarmupGame i18n', () => {
  it('renders German warm-up chrome and guidance copy', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(screen.getByText('Runde 1/3')).toBeInTheDocument();
    expect(screen.getByText('Aufwärmen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prüfen ✓' })).toBeDisabled();
    expect(screen.getByText('Wähle die richtige Possessivform.')).toBeInTheDocument();
    expect(
      screen.getByText('Wir sprechen über unseren Graphen - our + Nomen.')
    ).toBeInTheDocument();
    expect(screen.getByText('___ graph shows the quadratic function.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'their' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen ✓' }));

    expect(screen.getByText('Richtige Antwort: our.')).toBeInTheDocument();
    expect(screen.queryByText('Prawidłowa odpowiedź: our.')).not.toBeInTheDocument();
  });
});
